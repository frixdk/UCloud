package dk.sdu.cloud.app.kubernetes.rpc

import dk.sdu.cloud.app.kubernetes.api.AppKubernetesDescriptions
import dk.sdu.cloud.app.kubernetes.services.PodService
import dk.sdu.cloud.app.kubernetes.services.VncService
import dk.sdu.cloud.app.kubernetes.services.WebService
import dk.sdu.cloud.app.orchestrator.api.InternalFollowWSStreamResponse
import dk.sdu.cloud.app.orchestrator.api.InternalStdStreamsResponse
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.calls.server.WSCall
import dk.sdu.cloud.calls.server.sendWSMessage
import dk.sdu.cloud.calls.server.withContext
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.service.Loggable
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import java.io.Closeable
import java.util.*
import kotlin.collections.HashMap

class AppKubernetesController(
    private val podService: PodService,
    private val vncService: VncService,
    private val webService: WebService
) : Controller {
    private val streams = HashMap<String, Closeable>()

    override fun configure(rpcServer: RpcServer): Unit = with(rpcServer) {
        implement(AppKubernetesDescriptions.cleanup) {
            // TODO FIXME Will block the coroutine until we get a response.
            podService.cleanup(request.id)
            ok(Unit)
        }

        implement(AppKubernetesDescriptions.follow) {
            // TODO FIXME Blocks the coroutine for quite a while
            val (log, nextLine) = podService.retrieveLogs(
                request.job.id,
                request.stdoutLineStart,
                request.stdoutMaxLines
            )

            ok(InternalStdStreamsResponse(log, nextLine, "", 0))
        }

        implement(AppKubernetesDescriptions.cancelWSStream) {
            streams.remove(request.streamId)?.close()
            ok(Unit)
        }

        implement(AppKubernetesDescriptions.followWSStream) {
            val streamId = UUID.randomUUID().toString()
            sendWSMessage(InternalFollowWSStreamResponse(streamId))

            // Then we set up the subscription
            coroutineScope {
                // TODO FIXME This will run out of threads real quick. The backing dispatcher will never create more
                //  than 64 threads.
                launch(Dispatchers.IO) {
                    val (resource, logStream) = podService.watchLog(request.job.id) ?: return@launch
                    streams[streamId] = resource

                    withContext<WSCall> {
                        ctx.session.addOnCloseHandler {
                            resource.close()
                        }
                    }

                    val buffer = CharArray(4096)
                    val reader = logStream.reader()
                    while (streams[streamId] != null) {
                        val read = reader.read(buffer)
                        if (read == -1) break

                        sendWSMessage(InternalFollowWSStreamResponse(streamId, String(buffer, 0, read), null))
                    }
                }.join()
            }

            ok(InternalFollowWSStreamResponse(streamId))
        }

        implement(AppKubernetesDescriptions.jobVerified) {
            val sharedFileSystemMountsAreSupported =
                request.sharedFileSystemMounts.all { it.sharedFileSystem.backend == "kubernetes" }

            if (!sharedFileSystemMountsAreSupported) {
                throw RPCException(
                    "A file system mount was attempted which this backend does not support",
                    HttpStatusCode.BadRequest
                )
            }

            ok(Unit)
        }

        implement(AppKubernetesDescriptions.submitFile) {
            throw RPCException.fromStatusCode(HttpStatusCode.BadRequest) // Not supported
        }

        implement(AppKubernetesDescriptions.jobPrepared) {
            // TODO FIXME Blocks the coroutine for quite a while
            podService.create(request)
            ok(Unit)
        }

        implement(AppKubernetesDescriptions.queryInternalVncParameters) {
            ok(vncService.queryParameters(request.verifiedJob))
        }

        implement(AppKubernetesDescriptions.queryInternalWebParameters) {
            ok(webService.queryParameters(request.verifiedJob))
        }

        implement(AppKubernetesDescriptions.cancel) {
            // TODO FIXME Blocks the coroutine for quite a while.
            podService.cancel(request.verifiedJob)
            ok(Unit)
        }

        return@configure
    }

    companion object : Loggable {
        override val log = logger()
    }
}
