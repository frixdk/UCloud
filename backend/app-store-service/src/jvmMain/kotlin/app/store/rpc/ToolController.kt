package dk.sdu.cloud.app.store.rpc

import com.fasterxml.jackson.databind.JsonMappingException
import com.fasterxml.jackson.dataformat.yaml.snakeyaml.error.MarkedYAMLException
import com.fasterxml.jackson.module.kotlin.readValue
import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.app.store.api.ToolDescription
import dk.sdu.cloud.app.store.api.ToolStore
import dk.sdu.cloud.app.store.services.LogoService
import dk.sdu.cloud.app.store.services.LogoType
import dk.sdu.cloud.app.store.services.ToolAsyncDao
import dk.sdu.cloud.app.store.util.yamlMapper
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.calls.server.HttpCall
import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.calls.server.securityPrincipal
import dk.sdu.cloud.calls.types.BinaryStream
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.service.db.async.AsyncDBSessionFactory
import dk.sdu.cloud.service.db.withTransaction
import io.ktor.application.*
import io.ktor.http.*
import io.ktor.http.content.*
import io.ktor.request.*
import io.ktor.response.*
import io.ktor.util.cio.*
import io.ktor.utils.io.*
import org.yaml.snakeyaml.reader.ReaderException
import java.io.ByteArrayInputStream

class ToolController(
    private val db: AsyncDBSessionFactory,
    private val toolDao: ToolAsyncDao,
    private val logoService: LogoService
) : Controller {
    override fun configure(rpcServer: RpcServer) = with(rpcServer) {
        implement(ToolStore.findByName) {
            val result = db.withTransaction {
                toolDao.findAllByName(
                    it,
                    ctx.securityPrincipal,
                    request.appName,
                    request.normalize()
                )
            }

            ok(result)
        }

        implement(ToolStore.findByNameAndVersion) {
            val result = db.withTransaction {
                toolDao.findByNameAndVersion(
                    it,
                    ctx.securityPrincipal,
                    request.name,
                    request.version
                )
            }
            ok(result)
        }

        implement(ToolStore.listAll) {
            ok(
                db.withTransaction {
                    toolDao.listLatestVersion(it, ctx.securityPrincipal, request.normalize())
                }
            )
        }

        implement(ToolStore.create) {
            val length = (ctx as HttpCall).call.request.header(HttpHeaders.ContentLength)?.toLongOrNull()
                ?: throw RPCException("Content-Length required", HttpStatusCode.BadRequest)
            val channel = (ctx as HttpCall).call.request.receiveChannel()
            val content = ByteArray(length.toInt())
                .also { arr -> channel.readFully(arr) }
                .let { String(it) }

            @Suppress("DEPRECATION")
            val yamlDocument = try {
                yamlMapper.readValue<ToolDescription>(content)
            } catch (ex: JsonMappingException) {
                error(
                    CommonErrorMessage(
                        "Bad value for parameter ${ex.pathReference.replace(
                            "dk.sdu.cloud.app.api.",
                            ""
                        )}. ${ex.message}"
                    ),
                    HttpStatusCode.BadRequest
                )
                return@implement
            } catch (ex: MarkedYAMLException) {
                error(CommonErrorMessage("Invalid YAML document"), HttpStatusCode.BadRequest)
                return@implement
            } catch (ex: ReaderException) {
                error(
                    CommonErrorMessage("Document contains illegal characters (unicode?)"),
                    HttpStatusCode.BadRequest
                )
                return@implement
            }

            db.withTransaction {
                toolDao.create(it, ctx.securityPrincipal, yamlDocument.normalize(), content)
            }

            ok(Unit)
        }

        implement(ToolStore.uploadLogo) {
            logoService.acceptUpload(
                ctx.securityPrincipal,
                LogoType.TOOL,
                request.name,
                (ctx as HttpCall).call.request.header(HttpHeaders.ContentLength)?.toLongOrNull(),
                (ctx as HttpCall).call.request.receiveChannel()
            )

            ok(Unit)
        }

        implement(ToolStore.clearLogo) {
            logoService.clearLogo(ctx.securityPrincipal, LogoType.TOOL, request.name)
            ok(Unit)
        }

        implement(ToolStore.fetchLogo) {
            val logo = logoService.fetchLogo(LogoType.TOOL, request.name)
            (ctx as HttpCall).call.respond(
                object : OutgoingContent.ReadChannelContent() {
                    override val contentLength = logo.size.toLong()
                    override val contentType = ContentType.Image.Any
                    override fun readFrom(): ByteReadChannel = ByteArrayInputStream(logo).toByteReadChannel()
                }
            )

            okContentAlreadyDelivered()
        }
    }
}
