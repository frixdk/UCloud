package dk.sdu.cloud.file.ucloud.services

import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.defaultMapper
import dk.sdu.cloud.file.ucloud.LocalSyncthingDevice
import dk.sdu.cloud.file.ucloud.SynchronizationConfiguration
import dk.sdu.cloud.service.db.async.DBContext
import dk.sdu.cloud.service.db.async.getField
import dk.sdu.cloud.service.db.async.sendPreparedStatement
import dk.sdu.cloud.service.db.async.withSession
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.content.*
import io.ktor.http.*
import io.ktor.util.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString

@Serializable
data class SyncthingIgnoredFolder(
    val id: String,
    val label: String,
    val time: String
)

@Serializable
data class SyncthingRemoteIgnoredDevices(
    val address: String,
    val deviceID: String,
    val name: String,
    val time: String
)

@Serializable
data class SyncthingDevice(
    val addresses: List<String> = listOf("dynamic"),
    val allowedNetworks: List<String> = emptyList(),
    val autoAcceptFolders: Boolean = false,
    val certName: String = "",
    val compression: String = "metadata",
    val deviceID: String = "",
    val ignoredFolders: List<SyncthingIgnoredFolder> = emptyList(),
    val introducedBy: String = "",
    val introducer: Boolean = false,
    val maxRecvKbps: Int = 0,
    val maxRequestKiB: Int = 0,
    val maxSendKbps: Int = 0,
    val name: String = "",
    val paused: Boolean = false,
    val remoteGUIPort: Int = 0,
    val skipIntroductionRemovals: Boolean = false,
    val untrusted: Boolean = false
)

@Serializable
data class SyncthingDefaults(
    val device: SyncthingDevice = SyncthingDevice(),
    val folder: SyncthingFolder = SyncthingFolder()
)

@Serializable
data class SyncthingGui(
    val address: String = "",
    val apiKey: String = "",
    val authMode: String = "static",
    val debugging: Boolean = false,
    val enabled: Boolean = true,
    val insecureAdminAccess: Boolean = false,
    val insecureAllowFrameLoading: Boolean = false,
    val insecureSkipHostcheck: Boolean = false,
    val password: String = "",
    val theme: String = "default",
    val unixSocketPermissions: String = "",
    val useTLS: Boolean = false,
    val user: String = ""
)

@Serializable
data class SyncthingLdap(
    val address: String = "",
    val bindDN: String = "",
    val insecureSkipVerify: Boolean = false,
    val searchBaseDN: String = "",
    val searchFilter: String = "",
    val transport: String = "plain"
)

@Serializable
data class SyncthingOptions(
    val alwaysLocalNets: List<String> = emptyList(),
    val announceLANAddresses: Boolean = true,
    val autoUpgradeIntervalH: Int = 12,
    val cacheIgnoredFiles: Boolean = false,
    val connectionLimitEnough: Int = 0,
    val connectionLimitMax: Int = 0,
    val crURL: String = "https://crash.syncthing.net/newcrash",
    val crashReportingEnabled: Boolean = false,
    val databaseTuning: String = "auto",
    val featureFlags: List<String> = emptyList(),
    val globalAnnounceEnabled: Boolean = true,
    val globalAnnounceServers: List<String> = listOf("default"),
    val keepTemporariesH: Int = 24,
    val limitBandwidthInLan: Boolean = false,
    val listenAddresses: List<String> = listOf("default"),
    val localAnnounceEnabled: Boolean = true,
    val localAnnounceMCAddr: String = "[ff12::8384]:21027",
    val localAnnouncePort: Int = 21027,
    val maxConcurrentIncomingRequestKiB: Int = 0,
    val maxFolderConcurrency: Int = 0,
    val maxRecvKbps: Int = 0,
    val maxSendKbps: Int = 0,
    val minHomeDiskFree: MinDiskFree = MinDiskFree(),
    val natEnabled: Boolean = true,
    val natLeaseMinutes: Int = 60,
    val natRenewalMinutes: Int = 30,
    val natTimeoutSeconds: Int = 10,
    val overwriteRemoteDeviceNamesOnConnect: Boolean = false,
    val progressUpdateIntervalS: Int = 5,
    val reconnectionIntervalS: Int = 60,
    val relayReconnectIntervalM: Int = 10,
    val relaysEnabled: Boolean = true,
    val releasesURL: String = "https://upgrades.syncthing.net/meta.json",
    val restartOnWakeup: Boolean = true,
    val sendFullIndexOnUpgrade: Boolean = false,
    val setLowPriority: Boolean = true,
    val startBrowser: Boolean = true,
    val stunKeepaliveMinS: Int = 20,
    val stunKeepaliveStartS: Int = 180,
    val stunServers: List<String> = listOf("default"),
    val tempIndexMinBlocks: Int = 10,
    val trafficClass: Int = 0,
    val unackedNotificationIDs: List<String> = emptyList(),
    val upgradeToPreReleases: Boolean = false,
    val urAccepted: Int = -1,
    val urInitialDelayS: Int = 1800,
    val urPostInsecurely: Boolean = false,
    val urSeen: Int = 3,
    val urURL: String = "https://data.syncthing.net/newdata",
    val urUniqueId: String = ""
)

@Serializable
data class SyncthingConfig(
    val defaults: SyncthingDefaults,
    val devices: List<SyncthingDevice> = emptyList(),
    val folders: List<SyncthingFolder> = emptyList(),
    val gui: SyncthingGui,
    val ldap: SyncthingLdap,
    val options: SyncthingOptions,
    val remoteIgnoredDevices: List<SyncthingRemoteIgnoredDevices> = emptyList(),
    val version: Int = 35
)

@Serializable
data class SyncthingFolder(
    val autoNormalize: Boolean = true,
    val blockPullOrder: String = "standard",
    val caseSensitiveFS: Boolean = false,
    val copiers: Int = 0,
    val copyOwnershipFromParent: Boolean = false,
    val copyRangeMethod: String = "standard",
    val devices: List<SyncthingFolderDevice> = emptyList(),
    val disableFsync: Boolean = false,
    val disableSparseFiles: Boolean = false,
    val disableTempIndexes: Boolean = false,
    val filesystemType: String = "basic",
    val fsWatcherDelayS: Int = 10,
    val fsWatcherEnabled: Boolean = true,
    val hashers: Int = 0,
    val id: String = "",
    val ignoreDelete: Boolean = false,
    val ignorePerms: Boolean = false,
    val junctionsAsDirs: Boolean = false,
    val label: String = "",
    val markerName: String = ".stfolder",
    val maxConcurrentWrites: Int = 2,
    val maxConflicts: Int = 10,
    val minDiskFree: MinDiskFree = MinDiskFree(),
    val modTimeWindowS: Int = 0,
    val order: String = "random",
    val path: String = "",
    val paused: Boolean = false,
    val pullerMaxPendingKiB: Int = 0,
    val pullerPauseS: Int = 0,
    val rescanIntervalS: Int = 3600,
    val scanProgressIntervalS: Int = 0,
    val type: String = "receiveonly",
    val versioning: Versioning = Versioning(),
    val weakHashThresholdPct: Int = 25
)

@Serializable
data class MinDiskFree(
    val unit: String = "%",
    val value: Int = 1
)

@Serializable
data class Versioning(
    val cleanupIntervalS: Int = 0,
    val fsPath: String = "",
    val fsType: String = "basic",
    val params: VersioningParams = Unit,
    val type: String = ""
)

typealias VersioningParams = Unit


@Serializable
data class SyncthingFolderDevice(
    val deviceID: String,
    val encryptionPassword: String = "",
    val introducedBy: String = ""
)

class SyncthingClient(
    val config: SynchronizationConfiguration,
    val db: DBContext
) {
    private val httpClient = HttpClient(CIO) {
        expectSuccess = false
    }

    private suspend fun readConfig(device: LocalSyncthingDevice): SyncthingConfig {
        val requestPath = "http://" + device.hostname + "/rest/config"
        val resp = httpClient.get<HttpResponse>(requestPath) {
            headers {
                append("X-API-Key", device.apiKey)
            }
        }

        val config = resp.content.toByteArray().toString(Charsets.UTF_8)
        return defaultMapper.decodeFromString(config)
    }

    suspend fun writeConfig() {
        config.devices.forEach { device ->
            val result = db.withSession { session ->
                session.sendPreparedStatement(
                    {
                        setParameter("localDevice", device.id)
                    },
                    """
                       select id, path, access_type, d.device_id, d.user_id from file_ucloud.synchronized_folders as f
                       inner join file_ucloud.user_devices as d on f.user_id = d.user_id
                       where f.device_id = :localDevice
                    """
                )
            }.rows
            val oldConfig = readConfig(device)

            val newConfig = oldConfig.copy(
                devices = result.map { row ->
                    SyncthingDevice(
                        deviceID = row.getField(UserDevicesTable.device),
                        name = row.getField(UserDevicesTable.device)
                    )
                } + listOf(SyncthingDevice(deviceID = device.id, name = device.name)),
                folders = result.map { row ->
                    SyncthingFolder(
                        id = row.getField(SynchronizedFoldersTable.id),
                        label = row.getField(SynchronizedFoldersTable.path).substringAfterLast("/"),
                        devices = db.withSession { session ->
                            session.sendPreparedStatement(
                                {
                                    setParameter("user", row.getField(UserDevicesTable.user))
                                },
                                """
                                    select device_id
                                    from file_ucloud.user_devices
                                    where user_id = :user
                                """
                            ).rows.map { SyncthingFolderDevice(it.getField(UserDevicesTable.device)) }
                        },
                        path = row.getField(SynchronizedFoldersTable.path)
                    )
                }
            )

            val resp = httpClient.put<HttpResponse>("http://" + device.hostname + "/rest/config") {
                body = TextContent(
                    defaultMapper.encodeToString(newConfig),
                    ContentType.Application.Json
                )
                headers {
                    append("X-API-Key", device.apiKey)
                }
            }

            if (resp.status != HttpStatusCode.OK) {
                throw RPCException(resp.content.toByteArray().toString(Charsets.UTF_8), HttpStatusCode.BadRequest)
            }
        }
    }
}