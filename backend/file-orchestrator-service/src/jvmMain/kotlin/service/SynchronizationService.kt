package dk.sdu.cloud.file.orchestrator.service

import dk.sdu.cloud.ActorAndProject
import dk.sdu.cloud.accounting.api.UCLOUD_PROVIDER
import dk.sdu.cloud.calls.client.call
import dk.sdu.cloud.calls.client.orThrow
import dk.sdu.cloud.file.orchestrator.api.*

class SynchronizationService(
    private val providers: Providers,
    private val providerSupport: ProviderSupport,
    private val projectCache: ProjectCache,
) {
    suspend fun retrieveFolder(
        actorAndProject: ActorAndProject,
        request: SynchronizationRetrieveFolderRequest
    ): SynchronizedFolder {
        val comms = providers.prepareCommunication(request.provider)

        return comms.synchronizationApi.retrieveFolder.call(
            proxiedRequest(
                projectCache,
                actorAndProject,
                FindByPath(request.path)
            ),
            comms.client
        ).orThrow()
    }

    suspend fun addFolder(actorAndProject: ActorAndProject, request: SynchronizationAddFolderRequest) {
        val comms = providers.prepareCommunication(request.provider)

        comms.synchronizationApi.addFolder.call(
            proxiedRequest(
                projectCache,
                actorAndProject,
                request
            ),
            comms.client
        )
    }

    suspend fun removeFolder(actorAndProject: ActorAndProject, request: SynchronizationRemoveFolderRequest) {
        val comms = providers.prepareCommunication(request.provider)

        comms.synchronizationApi.removeFolder.call(
            proxiedRequest(
                projectCache,
                actorAndProject,
                request
            ),
            comms.client
        )
    }

    suspend fun addDevice(actorAndProject: ActorAndProject, request: SynchronizationAddDeviceRequest) {
        val comms = providers.prepareCommunication(request.provider)

        comms.synchronizationApi.addDevice.call(
            proxiedRequest(
                projectCache,
                actorAndProject,
                request
            ),
            comms.client
        )
    }

    suspend fun browseDevices(
        actorAndProject: ActorAndProject,
        request: SynchronizationBrowseDevicesRequest
    ): SynchronizationBrowseDevicesResponse {
        val comms = providers.prepareCommunication(request.provider)

        return comms.synchronizationApi.browseDevices.call(
            proxiedRequest(
                projectCache,
                actorAndProject,
                request
            ),
            comms.client
        ).orThrow()
    }

    suspend fun removeDevice(
        actorAndProject: ActorAndProject,
        request: SynchronizationRemoveDeviceRequest
    ) {
        val comms = providers.prepareCommunication(request.provider)

        return comms.synchronizationApi.removeDevice.call(
            proxiedRequest(
                projectCache,
                actorAndProject,
                request
            ),
            comms.client
        ).orThrow()
    }
}