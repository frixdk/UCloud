package dk.sdu.cloud.file.ucloud.rpc

import dk.sdu.cloud.Actor
import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.calls.server.securityPrincipal
import dk.sdu.cloud.file.ucloud.api.UCloudSynchronization
import dk.sdu.cloud.file.ucloud.services.SynchronizationService
import dk.sdu.cloud.service.Controller

class SynchronizationController(
    private val synchronizationService: SynchronizationService
) : Controller {
    override fun configure(rpcServer: RpcServer) = with(rpcServer) {
        implement(UCloudSynchronization.addFolder) {
            ok(synchronizationService.addFolder(Actor.SystemOnBehalfOfUser(request.username), request.request))
        }

        implement(UCloudSynchronization.removeFolder) {
            ok(synchronizationService.removeFolder(Actor.SystemOnBehalfOfUser(request.username), request.request))
        }

        implement(UCloudSynchronization.addDevice) {
            synchronizationService.addDevice(Actor.SystemOnBehalfOfUser(request.username), request.request)
            ok(Unit)
        }

        implement(UCloudSynchronization.removeDevice) {
            ok(synchronizationService.removeDevice(request.id))
        }

        implement(UCloudSynchronization.browseDevices) {
            ok(synchronizationService.browseDevices(Actor.SystemOnBehalfOfUser(request.username)))
        }
    }
}