package dk.sdu.cloud.file.orchestrator.api

import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.Roles
import dk.sdu.cloud.calls.*

typealias SynchronizationProviderRetrieveFolderRequest = ProxiedRequest<FindByPath>
typealias SynchronizationProviderRetrieveFolderResponse = SynchronizationRetrieveFolderResponse

typealias SynchronizationProviderAddFolderRequest = ProxiedRequest<SynchronizationAddFolderRequest>
typealias SynchronizationProviderAddFolderResponse = Unit

typealias SynchronizationProviderRemoveFolderRequest = ProxiedRequest<SynchronizationRemoveFolderRequest>
typealias SynchronizationProviderRemoveFolderResponse = Unit

typealias SynchronizationProviderAddDeviceRequest = ProxiedRequest<SynchronizationAddDeviceRequest>
typealias SynchronizationProviderAddDeviceResponse = Unit

typealias SynchronizationProviderBrowseDevicesRequest = ProxiedRequest<Unit>
typealias SynchronizationProviderBrowseDevicesResponse = SynchronizationBrowseDevicesResponse

typealias SynchronizationProviderRemoveDeviceRequest = ProxiedRequest<SynchronizationRemoveDeviceRequest>
typealias SynchronizationProviderRemoveDeviceResponse = Unit


open class SynchronizationProvider(namespace: String) : CallDescriptionContainer("files.synchronization.provider.$namespace") {
    val baseContext = "/ucloud/$namespace/synchronization"

    val retrieveFolder = call<SynchronizationProviderRetrieveFolderRequest, SynchronizationProviderRetrieveFolderResponse,
        CommonErrorMessage>("retrieveFolder") {
        httpUpdate(baseContext, "retrieve", roles = Roles.SERVICE)
    }

    val addFolder = call<SynchronizationProviderAddFolderRequest, SynchronizationProviderAddFolderResponse,
        CommonErrorMessage>("addFolder") {
        httpCreate(baseContext, roles = Roles.SERVICE)
    }

    val removeFolder = call<SynchronizationProviderRemoveFolderRequest, SynchronizationProviderRemoveFolderResponse,
        CommonErrorMessage>("removeFolder") {
        httpDelete(baseContext, roles = Roles.SERVICE)
    }

    val addDevice = call<SynchronizationProviderAddDeviceRequest, SynchronizationProviderAddDeviceResponse,
        CommonErrorMessage>("addDevice") {
        httpCreate(baseContext, "device", roles = Roles.SERVICE)
    }

    val removeDevice = call<SynchronizationProviderRemoveDeviceRequest, SynchronizationProviderRemoveDeviceResponse,
        CommonErrorMessage>("removeDevice") {
        httpDelete(joinPath(baseContext, "device"), roles = Roles.SERVICE)
    }

    val browseDevices = call<SynchronizationProviderBrowseDevicesRequest, SynchronizationProviderBrowseDevicesResponse,
        CommonErrorMessage>("devices") {
        httpBrowse(baseContext, roles = Roles.SERVICE)
    }
}
