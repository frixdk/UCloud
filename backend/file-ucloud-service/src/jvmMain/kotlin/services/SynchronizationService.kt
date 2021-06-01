package dk.sdu.cloud.file.ucloud.services

import dk.sdu.cloud.Actor
import dk.sdu.cloud.PageV2
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.file.orchestrator.api.*
import dk.sdu.cloud.service.db.async.*
import io.ktor.http.*
import java.util.*

object SynchronizedFoldersTable : SQLTable("synchronized_folders") {
    val id = varchar("id", 36, notNull = true)
    val device = varchar("device_id", 64, notNull = true)
    val path = text("path", notNull = true)
    val accessType = varchar("access_type", 20, notNull = true)
    val user = text("user_id", notNull = true)
}

object UserDevicesTable : SQLTable("user_devices") {
    val device = varchar("device_id", 64, notNull = true)
    val user = text("user_id", notNull = true)
}

class SynchronizationService(
    private val syncthing: SyncthingClient,
    private val db: DBContext
) {
    suspend fun addFolder(actor: Actor, request: SynchronizationAddFolderRequest) {
        val id = UUID.randomUUID().toString()
        val device = syncthing.config.deviceId
        val accessType = "SEND_RECEIVE"

        val userDevices = db.withSession { session ->
            session.sendPreparedStatement(
                {
                    setParameter("user", actor.username)
                },
                """
                    select device_id
                    from file_ucloud.user_devices
                    where user_id = :user 
                """
            )
        }.rows.map {
            SyncthingFolderDevice(
                deviceID = it.getField(UserDevicesTable.device)
            )
        }

        syncthing.addFolder(
            SyncthingFolder(
                id = id,
                label = id,
                devices = userDevices,
                path = "/home/xirov/some_syncthing_test"
            )
        )

        db.withSession { session ->
            session.sendPreparedStatement(
                {
                    setParameter("id", id)
                    setParameter("device", device)
                    setParameter("path", request.path)
                    setParameter("user", actor.username)
                    setParameter("access", accessType)
                },
                """
                    insert into file_ucloud.synchronized_folders(
                        id, 
                        device_id, 
                        path,
                        user_id,
                        access_type
                    ) values (
                        :id,
                        :device,
                        :path,
                        :user,
                        :access
                    )
                """
            )
        }
    }

    suspend fun removeFolder(actor: Actor, request: SynchronizationRemoveFolderRequest) {
        val oldConfig = syncthing.readConfig()

        val newConfig = oldConfig.copy(
            folders = oldConfig.folders.filter {
                it.id != request.id
            }
        )

        syncthing.writeConfig(newConfig)

        db.withSession { session ->
            session.sendPreparedStatement(
                {
                    setParameter("id", request.id)
                    setParameter("user", actor.username)
                },
                """
                    delete from file_ucloud.synchronized_folders
                    where id = :id and user_id = :user
                """
            )
        }
    }

    suspend fun addDevice(actor: Actor, request: SynchronizationAddDeviceRequest) {
        if (request.id == syncthing.config.deviceId) {
            throw RPCException.fromStatusCode(HttpStatusCode.BadRequest)
        }

        val userFolders = db.withSession { session ->
            session.sendPreparedStatement(
                {
                    setParameter("user", actor.username)
                },
                """
                    select id
                    from file_ucloud.synchronized_folders
                    where user_id = :user 
                """
            )
        }.rows.map {
            it.getField(SynchronizedFoldersTable.id)
        }

        val oldConfig = syncthing.readConfig()
        val newConfig = oldConfig.copy(
            devices = oldConfig.devices + listOf(SyncthingDevice(deviceID = request.id, name = request.id)),
            folders = oldConfig.folders.map { folder ->
                if (folder.id in userFolders) {
                    folder.copy(
                        devices = folder.devices + listOf(SyncthingFolderDevice(deviceID = request.id))
                    )
                } else {
                    folder
                }
            }
        )

        syncthing.writeConfig(newConfig)

        db.withSession { session ->
            session.sendPreparedStatement(
                {
                    setParameter("device", request.id)
                    setParameter("user", actor.username)
                },
                """
                    insert into file_ucloud.user_devices(
                        device_id,
                        user_id
                    ) values (
                        :device,
                        :user
                    )
                """
            )
        }
    }

    suspend fun removeDevice(actor: Actor, request: SynchronizationRemoveDeviceRequest) {
        db.withSession { session ->
            session.sendPreparedStatement(
                {
                    setParameter("id", request.id)
                    setParameter("user", actor.username)
                },
                """
                    delete from file_ucloud.user_devices
                    where device_id = :id and user_id = :user
                """
            )
        }

        val oldConfig = syncthing.readConfig()

        val newConfig = oldConfig.copy(
            devices = oldConfig.devices.filter {
                it.deviceID != request.id
            },
            folders = oldConfig.folders.map { folder ->
                folder.copy(
                    devices = folder.devices.filter {
                        it.deviceID != request.id
                    }
                )
            }
        )

        syncthing.writeConfig(newConfig)
    }

    suspend fun browseDevices(actor: Actor): PageV2<SynchronizationDevice> {
        val devices = db.withSession { session ->
            session.sendPreparedStatement(
                {
                    setParameter("user", actor.username)
                },
                """
                        select device_id
                        from file_ucloud.user_devices
                        where user_id = :user
                        limit 100
                    """
            ).rows.map { SynchronizationDevice(it.getField(UserDevicesTable.device)) }
        }

        return PageV2(100, devices, null)
    }

    suspend fun retrieveFolder(actor: Actor, path: String): SynchronizedFolder {
        return db.withSession { session ->
            val folder = session.sendPreparedStatement(
                {
                    setParameter("user", actor.username)
                    setParameter("path", path)
                },
                """
                        select id, path, device_id
                        from file_ucloud.synchronized_folders
                        where user_id = :user and path = :path
                        limit 100
                    """
            ).rows

            if (folder.isEmpty()) {
                throw RPCException.fromStatusCode(HttpStatusCode.NotFound)
            }

            SynchronizedFolder(
                id = folder.first().getField(SynchronizedFoldersTable.id),
                path = folder.first().getField(SynchronizedFoldersTable.path),
                device_id = folder.first().getField(SynchronizedFoldersTable.device)
            )
        }
    }
}