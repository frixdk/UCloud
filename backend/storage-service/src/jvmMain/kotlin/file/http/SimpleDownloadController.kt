package dk.sdu.cloud.file.http

import com.auth0.jwt.interfaces.DecodedJWT
import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.auth.api.validateAndClaim
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.calls.client.AuthenticatedClient
import dk.sdu.cloud.calls.server.HttpCall
import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.calls.server.audit
import dk.sdu.cloud.calls.server.bearer
import dk.sdu.cloud.calls.types.BinaryStream
import dk.sdu.cloud.file.api.BulkFileAudit
import dk.sdu.cloud.file.api.DOWNLOAD_FILE_SCOPE
import dk.sdu.cloud.file.api.FileDescriptions
import dk.sdu.cloud.file.api.FileType
import dk.sdu.cloud.file.api.FindByPath
import dk.sdu.cloud.file.api.SensitivityLevel
import dk.sdu.cloud.file.api.StorageFile
import dk.sdu.cloud.file.api.StorageFileAttribute
import dk.sdu.cloud.file.api.fileName
import dk.sdu.cloud.file.api.fileType
import dk.sdu.cloud.file.api.joinPath
import dk.sdu.cloud.file.api.path
import dk.sdu.cloud.file.api.size
import dk.sdu.cloud.file.services.CoreFileSystemService
import dk.sdu.cloud.file.services.FSUserContext
import dk.sdu.cloud.file.services.FileLookupService
import dk.sdu.cloud.file.services.linuxfs.NativeFS
import dk.sdu.cloud.file.util.FSException
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.service.Loggable
import dk.sdu.cloud.service.TokenValidation
import dk.sdu.cloud.service.toSecurityToken
import io.ktor.application.call
import io.ktor.http.ContentRange
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.http.defaultForFilePath
import io.ktor.request.ranges
import io.ktor.response.*
import io.ktor.utils.io.ByteWriteChannel
import io.ktor.utils.io.jvm.javaio.toOutputStream
import org.apache.commons.compress.archivers.zip.AsiExtraField
import org.apache.commons.compress.archivers.zip.UnrecognizedExtraField
import org.apache.commons.compress.archivers.zip.Zip64Mode
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream
import org.apache.commons.compress.archivers.zip.ZipExtraField
import org.apache.commons.compress.archivers.zip.ZipShort
import java.io.File
import java.util.zip.ZipEntry

class SimpleDownloadController<Ctx : FSUserContext>(
    private val cloud: AuthenticatedClient,
    private val commandRunnerFactory: CommandRunnerFactoryForCalls<Ctx>,
    private val fs: CoreFileSystemService<Ctx>,
    private val tokenValidation: TokenValidation<DecodedJWT>,
    private val fileLookupService: FileLookupService<Ctx>,
    private val cephFsRoot: String
) : Controller {
    override fun configure(rpcServer: RpcServer) = with(rpcServer) {
        implement(FileDescriptions.download) {
            with(ctx as HttpCall) {
                audit(BulkFileAudit(FindByPath(request.path)))

                val hasTokenFromUrl = request.token != null
                val bearer = request.token ?: ctx.bearer ?: return@implement error(
                    CommonErrorMessage("Unauthorized"),
                    HttpStatusCode.Unauthorized
                )
                val principal = (if (hasTokenFromUrl) {
                    tokenValidation.validateAndClaim(bearer, listOf(DOWNLOAD_FILE_SCOPE), cloud)
                } else {
                    tokenValidation.validateOrNull(bearer)
                }) ?: return@implement error(
                    CommonErrorMessage("Unauthorized"),
                    HttpStatusCode.Unauthorized
                )

                if (hasTokenFromUrl) {
                    ctx.audit.securityPrincipalTokenToAudit = principal.toSecurityToken()
                }

                lateinit var stat: StorageFile
                val sensitivityCache = HashMap<String, SensitivityLevel>()
                commandRunnerFactory.withCtx(
                    this@implement,
                    principal.subject,
                    principalToVerify = principal.toSecurityToken().principal
                ) { ctx ->
                    val mode = setOf(
                        StorageFileAttribute.path,
                        StorageFileAttribute.size,
                        StorageFileAttribute.fileType
                    )

                    stat = fs.stat(ctx, request.path, mode)

                    // Check file sensitivity
                    val sensitivity = fileLookupService.lookupInheritedSensitivity(ctx, request.path, sensitivityCache)
                    if (sensitivity == SensitivityLevel.SENSITIVE) {
                        throw RPCException("Forbidden", HttpStatusCode.Forbidden)
                    }
                }

                when {
                    stat.fileType == FileType.DIRECTORY -> {
                        call.response.header(
                            HttpHeaders.ContentDisposition,
                            "attachment; filename=\"${stat.path.safeFileName()}.zip\""
                        )

                        (ctx as HttpCall).call.respond(
                            DirectWriteContent(
                                contentType = ContentType.Application.Zip,
                                status = HttpStatusCode.OK
                            ) {
                                commandRunnerFactory.withCtx(
                                    this@implement,
                                    principal.subject,
                                    principalToVerify = principal.toSecurityToken().principal
                                ) { ctx ->
                                    val zaos = ZipArchiveOutputStream(toOutputStream())
                                    zaos.setUseZip64(Zip64Mode.Always)
                                    zaos.use { os ->
                                        val rootFileName = stat.path.fileName()
                                        os.putArchiveEntry(ZipArchiveEntry("$rootFileName/"))
                                        os.closeArchiveEntry()

                                        val tree = fs.tree(
                                            ctx,
                                            stat.path,
                                            setOf(StorageFileAttribute.fileType, StorageFileAttribute.path)
                                        )

                                        for (item in tree) {
                                            val filePath = joinPath(
                                                rootFileName,
                                                item.path.substringAfter(stat.path).removePrefix("/")
                                            )

                                            val sensitivity = fileLookupService.lookupInheritedSensitivity(
                                                ctx,
                                                item.path,
                                                sensitivityCache
                                            )

                                            if (sensitivity == SensitivityLevel.SENSITIVE) {
                                                continue
                                            }

                                            if (item.fileType == FileType.FILE) {
                                                val absoFilePath = joinPath(
                                                    cephFsRoot,
                                                    stat.path,
                                                    item.path.substringAfter(stat.path).removePrefix("/")
                                                )
                                                val perm = runCatching {
                                                    NativeFS.readNativeFilePermissons(File(absoFilePath))
                                                }.getOrDefault(304472)
                                                val entry = ZipArchiveEntry(filePath)
                                                entry.unixMode = perm
                                                os.putArchiveEntry(entry)

                                                try {
                                                    fs.read(ctx, item.path) { copyTo(os) }
                                                } catch (ex: FSException.PermissionException) {
                                                    // Skip files we don't have permissions for
                                                } finally {
                                                    os.closeArchiveEntry()
                                                }
                                            } else if (item.fileType == FileType.DIRECTORY) {
                                                os.putArchiveEntry(ZipArchiveEntry(filePath.removeSuffix("/") + "/"))
                                                os.closeArchiveEntry()
                                            }
                                        }
                                    }
                                }
                            }
                        )

                        okContentAlreadyDelivered()
                    }

                    stat.fileType == FileType.FILE -> {
                        val contentType = ContentType.defaultForFilePath(stat.path)
                        // TODO FIXME HEADERS ARE NOT ESCAPED
                        call.response.header(
                            HttpHeaders.ContentDisposition,
                            "attachment; filename=\"${stat.path.safeFileName()}\""
                        )

                        // We support a single byte range. Any other unit or multiple ranges will cause us to
                        // ignore the request and just send the full document.
                        val range: LongRange? = run {
                            val range = call.request.ranges() ?: return@run null
                            if (range.unit != "bytes") return@run null
                            if (range.ranges.size != 1) return@run null

                            val result = when (val actualRange = range.ranges.single()) {
                                is ContentRange.Bounded -> (actualRange.from)..(actualRange.to)
                                is ContentRange.TailFrom -> (actualRange.from) until (stat.size)
                                is ContentRange.Suffix -> (stat.size - actualRange.lastCount) until (stat.size)
                                else -> error("Unknown range size")
                            }

                            if (result.first >= result.last) return@run null
                            return@run result
                        }

                        val size = if (range == null) {
                            stat.size
                        } else {
                            if (range.first == 0L) {
                                range.last - range.first + 1
                            } else {
                                range.last - range.first
                            }
                        }

                        val statusCode = if (range == null) HttpStatusCode.OK else HttpStatusCode.PartialContent

                        if (range != null) {
                            call.response.header(HttpHeaders.ContentRange, "bytes ${range.first}-${range.last}/$size")
                        }

                        (ctx as HttpCall).call.respond(
                            DirectWriteContent(
                                contentLength = size,
                                contentType = contentType,
                                status = statusCode
                            ) {
                                commandRunnerFactory.withCtx(
                                    this@implement,
                                    principal.subject,
                                    principalToVerify = principal.toSecurityToken().principal
                                ) { ctx ->
                                    val writeChannel = this
                                    fs.read(ctx, request.path, range) {
                                        val stream = this
                                        stream.copyTo(writeChannel.toOutputStream())
                                    }
                                }
                            }
                        )

                        okContentAlreadyDelivered()
                    }

                    else -> error(
                        CommonErrorMessage("Bad request. Unsupported file type"),
                        HttpStatusCode.BadRequest
                    )
                }
            }
        }
    }

    companion object : Loggable {
        override val log = logger()

        private val safeFileNameChars =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ._-+,@£$€!½§~'=()[]{}0123456789".let {
                CharArray(it.length) { i -> it[i] }.toSet()
            }

        private fun String.safeFileName(): String {
            val normalName = fileName()
            return buildString(normalName.length) {
                normalName.forEach {
                    when (it) {
                        in safeFileNameChars -> append(it)
                        else -> append('_')
                    }
                }
            }
        }
    }
}

class DirectWriteContent(
    override val contentLength: Long? = null,
    override val contentType: ContentType? = null,
    override val status: HttpStatusCode? = null,
    private val writer: suspend ByteWriteChannel.() -> Unit
) : OutgoingContent.WriteChannelContent() {
    override suspend fun writeTo(channel: ByteWriteChannel) {
        writer(channel)
    }
}
