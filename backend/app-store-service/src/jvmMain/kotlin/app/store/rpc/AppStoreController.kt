package dk.sdu.cloud.app.store.rpc

import com.fasterxml.jackson.databind.JsonMappingException
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.dataformat.yaml.snakeyaml.error.MarkedYAMLException
import com.fasterxml.jackson.module.kotlin.jsonMapper
import com.fasterxml.jackson.module.kotlin.readValue
import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.app.store.api.AppStore
import dk.sdu.cloud.app.store.api.ApplicationDescription
import dk.sdu.cloud.app.store.services.AppStoreService
import dk.sdu.cloud.app.store.util.yamlMapper
import dk.sdu.cloud.app.store.util.jsonMapper
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.calls.server.HttpCall
import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.calls.server.project
import dk.sdu.cloud.calls.server.securityPrincipal
import dk.sdu.cloud.defaultMapper
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.service.Loggable
import io.ktor.application.call
import io.ktor.http.*
import io.ktor.request.*
import io.ktor.utils.io.*
import kotlinx.serialization.decodeFromString
import org.yaml.snakeyaml.reader.ReaderException

class AppStoreController(
    private val appStore: AppStoreService
) : Controller {
    override fun configure(rpcServer: RpcServer): Unit = with(rpcServer) {

        implement(AppStore.findByNameAndVersion) {
            ok(appStore.findByNameAndVersion(ctx.securityPrincipal, ctx.project, request.appName, request.appVersion))
        }

        implement(AppStore.hasPermission) {
            ok(appStore.hasPermission(ctx.securityPrincipal, ctx.project, request.appName, request.appVersion, request.permission))
        }

        implement(AppStore.listAcl) {
            ok(appStore.listAcl(ctx.securityPrincipal, request.appName))
        }

        implement(AppStore.updateAcl) {
            ok(appStore.updatePermissions(ctx.securityPrincipal, request.applicationName, request.changes))
        }

        implement(AppStore.findBySupportedFileExtension) {
            ok(
                appStore.findBySupportedFileExtension(
                    ctx.securityPrincipal,
                    ctx.project,
                    request.files
                )
            )
        }

        implement(AppStore.findByName) {
            ok(appStore.findByName(ctx.securityPrincipal, ctx.project, request.appName, request.normalize()))
        }

        implement(AppStore.listAll) {
            ok(appStore.listAll(ctx.securityPrincipal, ctx.project, request.normalize()))
        }

        implement(AppStore.create) {
            val length = (ctx as HttpCall).call.request.header(HttpHeaders.ContentLength)?.toLongOrNull()
                ?: throw RPCException("Content-Length required", HttpStatusCode.BadRequest)
            val channel = (ctx as HttpCall).call.request.receiveChannel()
            val content = ByteArray(length.toInt())
                .also { arr -> channel.readFully(arr) }
                .let { String(it) }

            val asJson = yamlMapper.readTree(content)
            val jsonAsString = jsonMapper.writeValueAsString(asJson)

            @Suppress("DEPRECATION")
            val yamlDocument = try {
                defaultMapper.decodeFromString<ApplicationDescription.V1>(jsonAsString)
            } catch (ex: JsonMappingException) {
                log.debug(ex.stackTraceToString())
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
                log.debug(ex.stackTraceToString())
                error(CommonErrorMessage("Invalid YAML document"), HttpStatusCode.BadRequest)
                return@implement
            } catch (ex: ReaderException) {
                error(
                    CommonErrorMessage("Document contains illegal characters (unicode?)"),
                    HttpStatusCode.BadRequest
                )
                return@implement
            }

            appStore.create(ctx.securityPrincipal, yamlDocument.normalize(), content)

            ok(Unit)
        }

        implement(AppStore.delete) {
            appStore.delete(ctx.securityPrincipal, ctx.project, request.appName, request.appVersion)
            ok(Unit)
        }

        implement(AppStore.findLatestByTool) {
            ok(appStore.findLatestByTool(ctx.securityPrincipal, ctx.project, request.tool, request.normalize()))
        }
    }

    companion object : Loggable {
        override val log = logger()
    }
}
