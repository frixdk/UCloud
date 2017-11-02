package org.esciencecloud.storage.irods

import org.esciencecloud.storage.*
import org.esciencecloud.storage.server.UserType
import org.irods.jargon.core.exception.*
import org.irods.jargon.core.protovalues.FilePermissionEnum
import org.irods.jargon.core.protovalues.UserTypeEnum
import org.irods.jargon.core.pub.domain.AvuData
import org.irods.jargon.core.pub.domain.ObjStat
import org.irods.jargon.core.pub.domain.UserFilePermission
import org.irods.jargon.core.pub.domain.UserGroup
import org.irods.jargon.core.pub.io.IRODSFile
import org.irods.jargon.core.query.CollectionAndDataObjectListingEntry
import org.irods.jargon.core.query.MetaDataAndDomainData
import org.irods.jargon.core.transfer.TransferStatus
import org.irods.jargon.core.transfer.TransferStatusCallbackListener
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

class IRodsPathOperations(override val services: AccountServices) : PathOperations, IRodsOperationService {
    override val localRoot: StoragePath =
            StoragePath.internalCreateFromHostAndAbsolutePath(services.connectionInformation.zone, "/")
    override val homeDirectory: StoragePath = StoragePath.internalCreateFromHostAndAbsolutePath(
            services.account.zone, "/home/${services.account.userName}")

    override fun parseAbsolute(absolutePath: String, addHost: Boolean): StoragePath {
        if (!absolutePath.startsWith("/")) throw IllegalArgumentException("Invalid iRODS path")
        val components = absolutePath.split("/").filter { it.isNotBlank() }
        return if (addHost) {
            localRoot.pushRelative('/' + components.joinToString("/"))
        } else {
            // TODO First component is empty
            StoragePath.internalCreateFromHostAndAbsolutePath(
                    components.first(), '/' + components.joinToString("/"))
        }
    }

}

class IRodsFileOperations(
        val paths: PathOperations,
        override val services: AccountServices
) : FileOperations, IRodsOperationService {
    override val usesTrashCan: Boolean = true

    companion object {
        const val BUFFER_SIZE = 1024 * 4096
    }

    override fun createDirectory(path: StoragePath, recursive: Boolean) {
        services.fileSystem.mkdir(path.toIRods(), recursive)
    }

    override fun put(path: StoragePath, source: InputStream) {
        source.transferTo(services.files.instanceIRODSFileOutputStream(path.toIRods()))
    }

    override fun put(path: StoragePath, localFile: File) {
        val callback = transferCallback()
        services.dataTransfer.putOperation(localFile, path.toIRods(), callback, transferControlBlock())
        val caughtException = callback.caughtException
        if (caughtException != null) {
            throw remapException(caughtException)
        }
    }

    override fun get(path: StoragePath, localFile: File) {
        val callback = transferCallback()
        services.dataTransfer.getOperation(path.toIRods(), localFile, callback, transferControlBlock())
        val caughtException = callback.caughtException
        if (caughtException != null) {
            throw remapException(caughtException)
        }
    }

    override fun bundlePut(path: StoragePath, source: ZipInputStream) {
        source.use { ins ->
            var currentEntry: ZipEntry? = ins.nextEntry
            while (currentEntry != null) {
                val entry = currentEntry
                val outputPath = path.pushRelative(entry.name)
                val entryStream = GuardedInputStream(ins)
                entryStream.transferTo(services.files.instanceIRODSFileOutputStream(outputPath.toIRods()))
                ins.closeEntry()
                currentEntry = ins.nextEntry
            }
        }
    }

    override fun get(path: StoragePath, output: OutputStream) {
        services.files.instanceIRODSFileInputStream(path.toIRods()).transferTo(output)
    }

    private fun InputStream.transferTo(output: OutputStream, bufferSize: Int = BUFFER_SIZE) {
        output.use { out ->
            this.use { ins ->
                val buffer = ByteArray(bufferSize)
                var hasMoreData = true
                while (hasMoreData) {
                    var ptr = 0
                    while (ptr < buffer.size && hasMoreData) {
                        val read = ins.read(buffer, ptr, buffer.size - ptr)
                        if (read <= 0) {
                            hasMoreData = false
                            break
                        }
                        ptr += read
                    }
                    out.write(buffer, 0, ptr)
                }
            }
        }
    }

    override fun getAtRange(range: LongRange, path: StoragePath, output: OutputStream) {
        TODO("not implemented")
    }

    override fun bundleGet(path: StoragePath, output: OutputStream, archiveType: ArchiveType) {
        TODO("Interface not designed")
    }

    override fun delete(path: StoragePath, recursive: Boolean) {
        val file = path.toIRods()
        if (file.isDirectory) {
            if (recursive) {
                services.fileSystem.directoryDeleteNoForce(file)
            } else {
                services.fileSystem.directoryDeleteForce(file)
            }
        } else {
            file.delete()
        }
    }

    override fun deleteWhere(path: StoragePath, vararg query: Any?) {
        TODO("Query not designed")
    }

    override fun emptyTrashCan() {
        TODO("Ordinary delete might actually skip trash can...")
    }

    override fun move(from: StoragePath, to: StoragePath) {
        val origFile = from.toIRods()
        val newFile = to.toIRods()
        if (origFile.isDirectory) {
            services.fileSystem.renameDirectory(origFile, newFile)
        } else {
            services.fileSystem.renameFile(origFile, newFile)
        }
    }

    override fun copy(from: StoragePath, to: StoragePath) {
        val callback = transferCallback()
        services.dataTransfer.copy(from.toIRods(), to.toIRods(), callback, transferControlBlock())
        val caughtException = callback.caughtException
        if (caughtException != null) {
            throw remapException(caughtException)
        }
    }

    override fun verifyConsistency(localFile: File, remoteFile: StoragePath): Boolean {
        TODO("not implemented")
    }

    private fun transferControlBlock() = services.dataTransfer.buildDefaultTransferControlBlockBasedOnJargonProperties()

    class OverwriteAndSaveExceptionCallbackListener : TransferStatusCallbackListener {
        var caughtException: Throwable? = null
            private set

        override fun transferAsksWhetherToForceOperation(p0: String?, p1: Boolean): TransferStatusCallbackListener.CallbackResponse {
            return TransferStatusCallbackListener.CallbackResponse.YES_FOR_ALL
        }

        override fun overallStatusCallback(p0: TransferStatus?) {}

        override fun statusCallback(status: TransferStatus?): TransferStatusCallbackListener.FileStatusCallbackResponse {
            val exception = status?.transferException
            if (exception != null) {
                caughtException = exception
                // This doesn't do what we want it to do. The client of this class will need to manually retrhwo the
                // caught exception (hence why we save it here)
            }
            return TransferStatusCallbackListener.FileStatusCallbackResponse.CONTINUE
        }

    }

    private fun transferCallback() = OverwriteAndSaveExceptionCallbackListener()

}

class IRodsMetadataOperations(
        val paths: PathOperations,
        override val services: AccountServices
) : MetadataOperations, IRodsOperationService {
    override fun updateMetadata(path: StoragePath, newOrUpdatesAttributes: Metadata,
                                attributesToDeleteIfExists: List<String>) {
        val absolutePath = path.toIRodsAbsolute()
        services.dataObjects.addBulkAVUMetadataToDataObject(absolutePath,
                newOrUpdatesAttributes.map { it.toIRods() }.toMutableList())
        services.dataObjects.deleteBulkAVUMetadataFromDataObject(absolutePath,
                attributesToDeleteIfExists.map { AvuData(it, "", "") }.toMutableList())
    }

    override fun removeAllMetadata(path: StoragePath) {
        services.dataObjects.deleteAllAVUForDataObject(path.toIRodsAbsolute())
    }
}

class IRodsAccessControlOperations(
        val paths: PathOperations,
        override val services: AccountServices
) : AccessControlOperations,
        IRodsOperationService {
    override fun updateACL(path: StoragePath, rights: AccessControlList, recursive: Boolean): Result<Unit> {
        val localZone = services.account.zone
        var result: Result<Unit> = Ok.empty()

        for (it in rights) {
            // TODO Clean this up
            val entityName: String
            val zone: String
            if (it.entity.name.contains('#')) {
                val split = it.entity.name.split('#')
                if (split.size != 2) {
                    result = Error.invalidMessage("Invalid entity name '${it.entity.name}'")
                    continue
                }
                entityName = split[0]
                zone = split[1]
            } else {
                entityName = it.entity.name
                zone = localZone
            }

            // TODO This is not even remotely atomic
            //
            // Maybe it is perfectly okay that we skip as needed? Probably shouldn't return an error always if some
            // of them go through. Maybe expand on Ok to include a "but" clause.
            //
            // In must cases it is probably perfectly acceptable that this might fail on some entries. Either way,
            // we must document this.
            services.dataObjects.setAccessPermission(
                    zone,
                    path.toIRodsAbsolute(),
                    entityName,
                    it.right.toIRods()
            ).onError { result = it }
        }

        return result
    }

    override fun listAt(path: StoragePath): Result<AccessControlList> {
        val listPermissionsForDataObject = services.dataObjects.listPermissionsForDataObject(path.toIRodsAbsolute())
        return listPermissionsForDataObject.map { it.map { it.toStorage() } }
    }

    override fun getMyPermissionAt(path: StoragePath): Result<AccessRight> {
        val connectedUser = IRodsUser(services.account.userName, services.account.zone)

        return services.dataObjects.getPermissionForDataObject(
                path.toIRodsAbsolute(),
                connectedUser.username,
                connectedUser.zone
        ).map { it.toStorage() }
    }
}

class IRodsFileQueryOperations(
        val paths: PathOperations,
        override val services: AccountServices
) : FileQueryOperations, IRodsOperationService {
    override fun listAt(path: StoragePath, preloadACLs: Boolean, preloadMetadata: Boolean): Result<List<StorageFile>> {
        // Always loads ACLs
        val absolutePath = path.toIRodsAbsolute()
        var results = services.collectionsAndObjectSearch
                .listDataObjectsAndCollectionsUnderPath(absolutePath)
                .map { it.toStorage(path) }

        if (preloadMetadata) {
            results = results.map {
                val metadata = services.dataObjects
                        .findMetadataValuesForDataObject(it.path.toIRodsAbsolute())
                        .map { it.map { it.toStorage() } }.capture() ?: return Result.lastError()
                StorageFile(it.path, it.type, it.acl, metadata)
            }
        }

        return Ok(results)
    }

    override fun listAtPathWithMetadata(path: StoragePath, query: Any?): Result<List<StorageFile>> {
        TODO("query interface not implemented")
    }


    override fun statBulk(vararg paths: StoragePath): Result<List<FileStat?>> {
        val result = paths.map { path ->
            try {
                services.fileSystem.getObjStat(path.toIRodsAbsolute()).toStorage()
            } catch (_: JargonException) {
                null
            }
        }
        return Ok(result)
    }

    private fun CollectionAndDataObjectListingEntry.toStorage(relativeTo: StoragePath): StorageFile {
        // TODO The ACL should also contain the information stored in the ownerName and zone
        return StorageFile(
                path = relativeTo.pushRelative(this.pathOrName),
                type = if (this.isCollection) FileType.DIRECTORY else FileType.FILE,
                acl = this.userFilePermission.map { it.toStorage() },
                metadata = null
        )
    }

    private fun ObjStat.toStorage(): FileStat =
            FileStat(
                    paths.parseAbsolute(this.absolutePath),
                    this.createdAt.time,
                    this.modifiedAt.time,
                    "${this.ownerName}#${this.ownerZone}",
                    this.objSize,
                    this.checksum
            )
}

class IRodsUserOperations(override val services: AccountServices) : UserOperations, IRodsOperationService {
    override fun modifyMyPassword(currentPassword: String, newPassword: String) {
        services.users.changeAUserPasswordByThatUser(services.account.userName, currentPassword, newPassword)
    }
}

class IRodsGroupOperations(override val services: AccountServices) : GroupOperations, IRodsOperationService {
    override fun createGroup(name: String): Result<Unit> {
        if (name.isEmpty()) return Error.invalidMessage("Name cannot be empty!")

        val userGroup = UserGroup().apply {
            userGroupName = name
            zone = services.connectionInformation.zone
        }

        try {
            services.userGroups.addUserGroup(userGroup)
        } catch (_: DuplicateDataException) {
            return Error.duplicateResource("Group '$name' already exists!")
        }
        return Ok.empty()
    }

    override fun deleteGroup(name: String, force: Boolean): Result<Unit> {
        if (name.isEmpty()) return Error.invalidMessage()

        val userGroup = services.userGroups.findByName(name)
        // If not empty
        try {
            val groupMembers = listGroupMembers(name).capture() ?: return Result.lastError()
            if (!force && groupMembers.isNotEmpty()) {
                return Error.invalidMessage("Cannot remove non-empty group without force flag")
            }
        } catch (_: NotFoundException) {
            return Ok.empty()
        }
        services.userGroups.removeUserGroup(userGroup)
        return Ok.empty()
    }

    override fun addUserToGroup(groupName: String, username: String): Result<Unit> {
        val user = IRodsUser.parse(services, username)
        try {
            services.userGroups.addUserToGroup(groupName, user.username, user.zone)
        } catch (_: DuplicateDataException) {
            // Ignored
        } catch (_: InvalidGroupException) {
            return Error.notFound()
        }
        return Ok.empty()
    }

    override fun removeUserFromGroup(groupName: String, username: String): Result<Unit> {
        val user = IRodsUser.parse(services, username)
        if (services.userGroups.findByName(groupName) == null) {
            return Error.notFound()
        }
        try {
            services.userGroups.removeUserFromGroup(groupName, user.username, user.zone)
        } catch (ex: JargonException) {
            // TODO The error code from Jargon are bugged. This could also be a permission exception
            return Error.notFound()
        }
        return Ok.empty()
    }

    override fun listGroupMembers(groupName: String): Result<List<User>> {
        if (services.userGroups.findByName(groupName) == null) {
            return Error.notFound()
        }
        return Ok(services.userGroups.listUserGroupMembers(groupName).map { it.toStorage() })
    }
}

private typealias JargonUser = org.irods.jargon.core.pub.domain.User

class IRodsUserAdminOperations(override val services: AccountServices) : UserAdminOperations, IRodsOperationService {
    override fun createUser(username: String, password: String?, type: UserType): Result<Unit> {
        val user = JargonUser().apply {
            name = username
            userType = type.toIRods()
        }

        services.users.addUser(user).capture() ?: return Result.lastError()
        return if (password != null) modifyPassword(user, password) else Ok.empty()
    }

    override fun deleteUser(username: String): Result<Unit> {
        try {
            services.users.deleteUser(username)
        } catch (_: DataNotFoundException) {
        } catch (_: InvalidUserException) {
        }
        return Ok.empty()
    }

    override fun modifyPassword(username: String, newPassword: String): Result<Unit> {
        val user = services.users.findByName(username).capture() ?: return Result.lastError()
        return modifyPassword(user, newPassword)
    }

    private fun modifyPassword(user: JargonUser, newPassword: String): Result<Unit> {
        services.users.changeAUserPasswordByAnAdmin(user.nameWithZone, newPassword)
        return Ok.empty()
    }

    override fun findByUsername(username: String): Result<User> =
        services.users.findByName(username).map { it.toStorage() }
}

interface IRodsOperationService {
    val services: AccountServices

    fun FilePermissionEnum.toStorage(): AccessRight = when (this) {
        FilePermissionEnum.OWN -> AccessRight.OWN
        FilePermissionEnum.WRITE -> AccessRight.READ_WRITE
        FilePermissionEnum.READ -> AccessRight.READ
        FilePermissionEnum.NULL -> AccessRight.NONE
        else -> AccessRight.NONE
    }

    fun UserFilePermission.toStorage(): AccessEntry =
            AccessEntry(IRodsUser.parse(services, this.nameWithZone), this.filePermissionEnum.toStorage())

    fun MetaDataAndDomainData.toStorage(): MetadataEntry =
            MetadataEntry(this.avuAttribute, this.avuValue)


    fun org.irods.jargon.core.pub.domain.User.toStorage(): User {
        return IRodsUser.parse(services, this.nameWithZone)
    }

    fun StoragePath.toIRods(): IRODSFile = services.files.instanceIRODSFile(this.toIRodsAbsolute())
    fun StoragePath.toIRodsAbsolute(): String = "/$host$path"

    fun AccessRight.toIRods(): FilePermissionEnum = when (this) {
        AccessRight.NONE -> FilePermissionEnum.NONE
        AccessRight.READ -> FilePermissionEnum.READ
        AccessRight.READ_WRITE -> FilePermissionEnum.WRITE
        AccessRight.OWN -> FilePermissionEnum.OWN
    }

    fun UserType.toIRods(): UserTypeEnum = when (this) {
        UserType.USER -> UserTypeEnum.RODS_USER
        UserType.ADMIN -> UserTypeEnum.RODS_ADMIN
        UserType.GROUP_ADMIN -> UserTypeEnum.RODS_GROUP // TODO I think?
    }

    fun MetadataEntry.toIRods(): AvuData = AvuData(this.key, this.value, "")
}
