package dk.sdu.cloud.file.orchestrator.api

import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.PageV2
import dk.sdu.cloud.calls.*
import kotlinx.serialization.Serializable

enum class SynchronizationType {
    SEND_RECEIVE,
    SEND_ONLY
}

@Serializable
data class SynchronizationDevice(val id: String)
@Serializable
data class SynchronizedFolder(
    val id: String,
    val path: String,
    val device_id: String
)

typealias SynchronizationBrowseDevicesRequest = Unit
typealias SynchronizationBrowseDevicesResponse = PageV2<SynchronizationDevice>

@Serializable
data class SynchronizationAddFolderRequest(
    val path: String
)
typealias SynchronizationAddFolderResponse = Unit

@Serializable
data class SynchronizationRemoveFolderRequest(
    val id: String
)
typealias SynchronizationRemoveFolderResponse = Unit

typealias SynchronizationAddDeviceRequest = SynchronizationDevice
typealias SynchronizationAddDeviceResponse = Unit

typealias SynchronizationRemoveDeviceRequest = SynchronizationDevice
typealias SynchronizationRemoveDeviceResponse = Unit

@Serializable
data class SynchronizationRetrieveFolderRequest(
    val path: String
)
typealias SynchronizationRetrieveFolderResponse = SynchronizedFolder


object Synchronization : CallDescriptionContainer("files.synchronization") {
    const val baseContext = "/api/files/synchronization"

    val retrieveFolder = call<SynchronizationRetrieveFolderRequest, SynchronizationRetrieveFolderResponse,
        CommonErrorMessage>("retrieveFolder") {
        httpRetrieve(baseContext)
    }

    val addFolder = call<SynchronizationAddFolderRequest, SynchronizationAddFolderResponse,
        CommonErrorMessage>("addFolder") {
        httpCreate(baseContext)
    }

    val removeFolder = call<SynchronizationRemoveFolderRequest, SynchronizationRemoveFolderResponse,
        CommonErrorMessage>("removeFolder") {
        httpDelete(baseContext)
    }

    val addDevice = call<SynchronizationAddDeviceRequest, SynchronizationAddDeviceResponse,
        CommonErrorMessage>("addDevice") {
        httpCreate(baseContext, "device")
    }

    val removeDevice = call<SynchronizationRemoveDeviceRequest, SynchronizationRemoveDeviceResponse,
        CommonErrorMessage>("removeDevice") {
        httpDelete(joinPath(baseContext, "device"))
    }

    val browseDevices = call<SynchronizationBrowseDevicesRequest, SynchronizationBrowseDevicesResponse,
        CommonErrorMessage>("browseDevices") {
        httpBrowse(baseContext)
    }
}
