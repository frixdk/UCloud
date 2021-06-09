package dk.sdu.cloud.file.orchestrator.rpc

import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.file.orchestrator.api.Synchronization
import dk.sdu.cloud.file.orchestrator.service.SynchronizationService
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.service.actorAndProject

class SynchronizationController(private val synchronization: SynchronizationService) : Controller {
    override fun configure(rpcServer: RpcServer) = with(rpcServer) {
        implement(Synchronization.retrieveFolder) {
            ok(synchronization.retrieveFolder(actorAndProject, request))
        }

        implement(Synchronization.addFolder) {
            ok(synchronization.addFolder(actorAndProject, request))
        }

        implement(Synchronization.removeFolder) {
            ok(synchronization.removeFolder(actorAndProject, request))
        }

        implement(Synchronization.addDevice) {
            ok(synchronization.addDevice(actorAndProject, request))
        }

        implement(Synchronization.browseDevices) {
            println("Call accepted")
            ok(synchronization.browseDevices(actorAndProject, request))
        }

        implement(Synchronization.removeDevice) {
            ok(synchronization.removeDevice(actorAndProject, request))
        }

        return@with
    }
}