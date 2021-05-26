package dk.sdu.cloud.file.ucloud.services

import com.github.jasync.sql.db.util.length
import dk.sdu.cloud.Actor
import dk.sdu.cloud.PageV2
import dk.sdu.cloud.file.orchestrator.api.SynchronizationAddDeviceRequest
import dk.sdu.cloud.file.orchestrator.api.SynchronizationAddFolderRequest
import dk.sdu.cloud.file.orchestrator.api.SynchronizationDevice
import dk.sdu.cloud.file.orchestrator.api.SynchronizationRemoveFolderRequest
import dk.sdu.cloud.service.db.async.*

object SynchronizedFoldersTable : SQLTable("synchronized_folders") {
    val id = long("id", notNull = true)
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
    private val db: DBContext,
) {
    suspend fun addFolder(actor: Actor, request: SynchronizationAddFolderRequest) {
        // TODO
        val id = ""
        val device = ""
        val accessType = ""

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
                        user,
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

    suspend fun addDevice(actor: Actor, request: SynchronizationAddDeviceRequest) {
        // TODO Check if id is an internal device id on UCloud

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

    suspend fun removeFolder(actor: Actor, request: SynchronizationRemoveFolderRequest) {
        db.withSession { session ->
            session.sendPreparedStatement(
                {
                    setParameter("id", request.id)
                },
                """
                    delete from file_ucloud.synchronized_folders
                    where id = :id
                """
            )
        }
    }

    fun removeDevice(device: String) {
        // TODO
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
}