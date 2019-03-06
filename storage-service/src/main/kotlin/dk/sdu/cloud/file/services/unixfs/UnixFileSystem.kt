package dk.sdu.cloud.file.services.unixfs

import dk.sdu.cloud.file.SERVICE_UNIX_USER
import dk.sdu.cloud.file.api.AccessEntry
import dk.sdu.cloud.file.api.AccessRight
import dk.sdu.cloud.file.api.FileChecksum
import dk.sdu.cloud.file.api.FileType
import dk.sdu.cloud.file.api.StorageEvent
import dk.sdu.cloud.file.api.joinPath
import dk.sdu.cloud.file.api.normalize
import dk.sdu.cloud.file.services.FSACLEntity
import dk.sdu.cloud.file.services.FSResult
import dk.sdu.cloud.file.services.FileAttribute
import dk.sdu.cloud.file.services.FileRow
import dk.sdu.cloud.file.services.FileSensitivityService
import dk.sdu.cloud.file.services.LowLevelFileSystemInterface
import dk.sdu.cloud.file.services.StorageUserDao
import dk.sdu.cloud.file.services.asBitSet
import dk.sdu.cloud.file.util.FSException
import dk.sdu.cloud.file.util.unwrap
import dk.sdu.cloud.service.BashEscaper
import dk.sdu.cloud.service.Loggable
import dk.sdu.cloud.service.stackTraceToString
import kotlinx.coroutines.runBlocking
import java.io.File
import java.io.InputStream
import java.io.OutputStream

private const val NOT_FOUND = -2

class UnixFileSystem(
    private val processRunner: UnixFSCommandRunnerFactory,
    private val userDao: StorageUserDao<Long>,
    private val fileAttributeParser: FileAttributeParser,
    private val fsRoot: String
) : LowLevelFileSystemInterface<UnixFSCommandRunner> {
    // TODO This attribute probably needs to live somewhere else
    private val attributesToCopy = listOf(FileSensitivityService.XATTRIBUTE)

    // Note: We should generally avoid these cyclic dependencies
    private val fileOwnerLookupService = FileOwnerLookupService(processRunner, this)

    override suspend fun copy(
        ctx: UnixFSCommandRunner,
        from: String,
        to: String,
        allowOverwrite: Boolean
    ): FSResult<List<StorageEvent.CreatedOrRefreshed>> {
        val fromPath = translateAndCheckFile(from)
        val toPath = translateAndCheckFile(to)

        val result = ctx.runCommand(
            InterpreterCommand.COPY,
            fromPath,
            toPath,
            if (allowOverwrite) "1" else "0",

            consumer = { out ->
                parseFileAttributes(
                    out.stdoutLineSequence(),
                    CREATED_OR_MODIFIED_ATTRIBUTES
                ).asFSResult { createdOrModifiedFromRow(it, ctx.user) }
            }
        )

        if (result.statusCode == 0) {
            attributesToCopy.forEach { attr ->
                try {
                    val value = getExtendedAttribute(ctx, from, attr).unwrap()
                    setExtendedAttribute(ctx, to, attr, value).unwrap()
                } catch (ex: Exception) {
                    if (ex !is FSException.NotFound) {
                        log.info("Exception caught while copying attribute: $attr")
                        log.info(ex.stackTraceToString())
                    }
                }
            }
        }

        return result
    }

    override suspend fun move(
        ctx: UnixFSCommandRunner,
        from: String,
        to: String,
        allowOverwrite: Boolean
    ): FSResult<List<StorageEvent.Moved>> {
        val fromPath = translateAndCheckFile(from)
        val toPath = translateAndCheckFile(to)

        val fromStat = stat(ctx, from, setOf(FileAttribute.FILE_TYPE))
        if (fromStat.statusCode != 0) return FSResult(fromStat.statusCode)

        val timestamp = System.currentTimeMillis()

        return ctx.runCommand(
            InterpreterCommand.MOVE,
            fromPath,
            toPath,
            if (allowOverwrite) "1" else "0",

            consumer = { out ->
                val toList = out.stdoutLineSequence().toList()
                val sequence = toList.iterator()
                val realFrom = sequence.next()
                    .takeIf { !it.startsWith(EXIT) }
                    ?.toCloudPath() ?: return@runCommand FSResult<List<StorageEvent.Moved>>(NOT_FOUND)

                val realTo = sequence.next().toCloudPath()

                parseFileAttributes(
                    sequence,
                    MOVED_ATTRIBUTES
                ).asFSResult {
                    assert(it.path.startsWith(realTo))
                    val basePath = it.path.removePrefix(realTo).removePrefix("/")
                    val oldPath = if (fromStat.value.fileType == FileType.DIRECTORY) {
                        joinPath(realFrom, basePath)
                    } else {
                        realFrom
                    }

                    StorageEvent.Moved(
                        id = it.inode,
                        path = it.path,
                        owner = it.xowner,
                        creator = it.owner,
                        timestamp = timestamp,
                        oldPath = oldPath
                    )
                }
            }
        )
    }

    override suspend fun listDirectory(
        ctx: UnixFSCommandRunner,
        directory: String,
        mode: Set<FileAttribute>
    ): FSResult<List<FileRow>> {
        val requestedAttributes = processRequestedAttributes(mode)
        return ctx.runCommand(
            InterpreterCommand.LIST_DIRECTORY,
            translateAndCheckFile(directory),
            requestedAttributes.asBitSet().toString(),

            consumer = { parseFileAttributes(it.stdoutLineSequence(), requestedAttributes).asFSResult() }
        )
    }

    override suspend fun delete(ctx: UnixFSCommandRunner, path: String): FSResult<List<StorageEvent.Deleted>> {
        val timestamp = System.currentTimeMillis()
        val absolutePath = translateAndCheckFile(path)

        return ctx.runCommand(
            InterpreterCommand.DELETE,
            absolutePath,
            consumer = { out ->
                parseFileAttributes(
                    out.stdoutLineSequence(),
                    DELETED_ATTRIBUTES
                ).asFSResult {
                    StorageEvent.Deleted(
                        id = it.inode,
                        path = it.path,
                        owner = it.xowner,
                        creator = it.owner,
                        timestamp = timestamp,
                        eventCausedBy = ctx.user
                    )
                }
            }
        )
    }

    override suspend fun openForWriting(
        ctx: UnixFSCommandRunner,
        path: String,
        allowOverwrite: Boolean
    ): FSResult<List<StorageEvent.CreatedOrRefreshed>> {
        val absolutePath = translateAndCheckFile(path)
        return ctx.runCommand(
            InterpreterCommand.WRITE_OPEN,
            absolutePath,
            if (allowOverwrite) "1" else "0",
            consumer = { out ->
                parseFileAttributes(
                    out.stdoutLineSequence(),
                    CREATED_OR_MODIFIED_ATTRIBUTES
                ).asFSResult { createdOrModifiedFromRow(it, ctx.user) }
            }
        )
    }

    override suspend fun write(
        ctx: UnixFSCommandRunner,
        writer: suspend (OutputStream) -> Unit
    ): FSResult<List<StorageEvent.CreatedOrRefreshed>> {
        return ctx.runCommand(
            InterpreterCommand.WRITE,
            writer = { writer(it) },
            consumer = { out ->
                parseFileAttributes(
                    out.stdoutLineSequence(),
                    CREATED_OR_MODIFIED_ATTRIBUTES
                ).asFSResult { createdOrModifiedFromRow(it, ctx.user) }
            }
        )
    }

    override suspend fun tree(
        ctx: UnixFSCommandRunner,
        path: String,
        mode: Set<FileAttribute>
    ): FSResult<List<FileRow>> {
        val absolutePath = translateAndCheckFile(path)
        val requestedAttributes = processRequestedAttributes(mode)
        return ctx.runCommand(
            InterpreterCommand.TREE,
            absolutePath,
            requestedAttributes.asBitSet().toString(),
            consumer = { parseFileAttributes(it.stdoutLineSequence(), requestedAttributes).asFSResult() }
        )
    }

    override suspend fun makeDirectory(
        ctx: UnixFSCommandRunner,
        path: String
    ): FSResult<List<StorageEvent.CreatedOrRefreshed>> {
        val absolutePath = translateAndCheckFile(path)
        return ctx.runCommand(
            InterpreterCommand.MKDIR,
            absolutePath,
            consumer = { out ->
                parseFileAttributes(
                    out.stdoutLineSequence(),
                    CREATED_OR_MODIFIED_ATTRIBUTES
                ).asFSResult { createdOrModifiedFromRow(it, ctx.user) }
            }
        )
    }

    override suspend fun getExtendedAttribute(
        ctx: UnixFSCommandRunner,
        path: String,
        attribute: String
    ): FSResult<String> {
        val absolutePath = translateAndCheckFile(path)
        return ctx.runCommand(
            InterpreterCommand.GET_XATTR,
            absolutePath,
            attribute.removePrefix(ATTRIBUTE_PREFIX).let { "$ATTRIBUTE_PREFIX$it" },

            consumer = {
                var value: String? = null
                var statusCode: Int? = null

                for (line in it.stdoutLineSequence()) {
                    if (line.startsWith(EXIT)) {
                        statusCode = line.split(":")[1].toInt()
                    } else {
                        value = line
                    }
                }

                FSResult(statusCode!!, value)
            }
        )
    }

    override suspend fun setExtendedAttribute(
        ctx: UnixFSCommandRunner,
        path: String,
        attribute: String,
        value: String,
        allowOverwrite: Boolean
    ): FSResult<Unit> {
        val absolutePath = translateAndCheckFile(path)
        return ctx.runCommand(
            InterpreterCommand.SET_XATTR,
            absolutePath,
            attribute.removePrefix(ATTRIBUTE_PREFIX).let { "$ATTRIBUTE_PREFIX$it" },
            value,
            if (allowOverwrite) "1" else "0",
            consumer = this::consumeStatusCode
        )
    }

    override suspend fun listExtendedAttribute(ctx: UnixFSCommandRunner, path: String): FSResult<List<String>> {
        val absolutePath = translateAndCheckFile(path)
        return ctx.runCommand(
            InterpreterCommand.LIST_XATTR,
            absolutePath,

            consumer = { out ->
                out.stdoutLineSequence().map {
                    if (it.startsWith(EXIT)) StatusTerminatedItem.Exit<String>(
                        it.split(":")[1].toInt()
                    )
                    else StatusTerminatedItem.Item(it)
                }.asFSResult()
            }
        )
    }

    override suspend fun deleteExtendedAttribute(
        ctx: UnixFSCommandRunner,
        path: String,
        attribute: String
    ): FSResult<Unit> {
        val absolutePath = translateAndCheckFile(path)
        return ctx.runCommand(
            InterpreterCommand.DELETE_XATTR,
            absolutePath,
            attribute.removePrefix(ATTRIBUTE_PREFIX).let { "$ATTRIBUTE_PREFIX$it"},
            consumer = this::consumeStatusCode
        )
    }

    override suspend fun stat(ctx: UnixFSCommandRunner, path: String, mode: Set<FileAttribute>): FSResult<FileRow> {
        val absolutePath = translateAndCheckFile(path)
        val requestedAttributes = processRequestedAttributes(mode)
        return ctx.runCommand(
            InterpreterCommand.STAT,
            absolutePath,
            requestedAttributes.asBitSet().toString(),
            consumer = { out ->
                parseFileAttributes(out.stdoutLineSequence(), requestedAttributes).asFSResult().let {
                    FSResult(it.statusCode, it.value.singleOrNull())
                }
            }
        )
    }

    override suspend fun openForReading(ctx: UnixFSCommandRunner, path: String): FSResult<Unit> {
        val absolutePath = translateAndCheckFile(path)
        return ctx.runCommand(
            InterpreterCommand.READ_OPEN,
            absolutePath,
            consumer = this::consumeStatusCode
        )
    }

    override suspend fun <R> read(ctx: UnixFSCommandRunner, range: IntRange?, consumer: suspend (InputStream) -> R): R {
        val start = range?.start ?: -1
        val end = range?.endInclusive ?: -1

        return ctx.runCommand(
            InterpreterCommand.READ,
            start.toString(),
            end.toString(),
            consumer = {
                it.clearBytes(it.stdout.readLineUnbuffered().toLong())
                return@runCommand consumer(it.stdout)
            }
        )
    }

    override suspend fun createSymbolicLink(
        ctx: UnixFSCommandRunner,
        targetPath: String,
        linkPath: String
    ): FSResult<List<StorageEvent.CreatedOrRefreshed>> {
        val absTargetPath = translateAndCheckFile(targetPath)
        val absLinkPath = translateAndCheckFile(linkPath)

        return ctx.runCommand(
            InterpreterCommand.SYMLINK,
            absTargetPath,
            absLinkPath,
            consumer = { out ->
                parseFileAttributes(
                    out.stdoutLineSequence(),
                    CREATED_OR_MODIFIED_ATTRIBUTES
                ).asFSResult { createdOrModifiedFromRow(it, ctx.user) }
            }
        )
    }

    override suspend fun createACLEntry(
        ctx: UnixFSCommandRunner,
        path: String,
        entity: FSACLEntity,
        rights: Set<AccessRight>,
        defaultList: Boolean,
        recursive: Boolean
    ): FSResult<Unit> {
        val absolutePath = translateAndCheckFile(path)

        val unixEntity = entity.toUnixEntity()
        if (unixEntity.statusCode != 0) return FSResult(unixEntity.statusCode)

        val command = ArrayList<String>().apply {
            if (defaultList) add("-d")
            if (recursive) add("-R")

            add("-m")
            val permissions: String = run {
                val read = if (AccessRight.READ in rights) "r" else "-"
                val write = if (AccessRight.WRITE in rights) "w" else "-"
                val execute = if (AccessRight.EXECUTE in rights) "x" else "X" // Note: execute is implicit for dirs

                read + write + execute
            }

            add(BashEscaper.safeBashArgument("${unixEntity.value.serializedEntity}:$permissions"))

            add(BashEscaper.safeBashArgument(absolutePath))
        }.joinToString(" ")

        return ctx.runCommand(
            InterpreterCommand.SETFACL,
            command,
            consumer = this::consumeStatusCode
        )
    }

    override suspend fun removeACLEntry(
        ctx: UnixFSCommandRunner,
        path: String,
        entity: FSACLEntity,
        defaultList: Boolean,
        recursive: Boolean
    ): FSResult<Unit> {
        val absolutePath = translateAndCheckFile(path)

        val unixEntity = entity.toUnixEntity()
        if (unixEntity.statusCode != 0) return FSResult(unixEntity.statusCode)

        val command = ArrayList<String>().apply {
            if (defaultList) add("-d")
            if (recursive) add("-R")
            add("-x")
            add(BashEscaper.safeBashArgument(unixEntity.value.serializedEntity))
            add(BashEscaper.safeBashArgument(absolutePath))
        }.joinToString(" ")

        return ctx.runCommand(
            InterpreterCommand.SETFACL,
            command,
            consumer = this::consumeStatusCode
        )
    }

    override suspend fun chmod(
        ctx: UnixFSCommandRunner,
        path: String,
        owner: Set<AccessRight>,
        group: Set<AccessRight>,
        other: Set<AccessRight>
    ): FSResult<List<StorageEvent.CreatedOrRefreshed>> {
        val absolutePath = translateAndCheckFile(path)
        fun Set<AccessRight>.toBitSet(): Int {
            var result = 0
            if (AccessRight.EXECUTE in this) result = result or 1
            if (AccessRight.WRITE in this) result = result or 2
            if (AccessRight.READ in this) result = result or 4
            return result
        }

        val mode = (owner.toBitSet() shl 6) or (group.toBitSet() shl 3) or (other.toBitSet())
        return ctx.runCommand(
            InterpreterCommand.CHMOD,
            absolutePath,
            mode.toString(),
            consumer = { out ->
                parseFileAttributes(
                    out.stdoutLineSequence(),
                    CREATED_OR_MODIFIED_ATTRIBUTES
                ).asFSResult { createdOrModifiedFromRow(it, ctx.user) }
            }
        )
    }

    private suspend fun FSACLEntity.toUnixEntity(): FSResult<FSACLEntity> {
        val entity = this
        return when (entity) {
            is FSACLEntity.User -> {
                val user = userDao.findStorageUser(entity.user) ?: return FSResult(NOT_FOUND)
                FSResult(0, FSACLEntity.User(user.toString()))
            }

            else -> FSResult(0, entity)
        }
    }

    private suspend fun consumeStatusCode(it: UnixFSCommandRunner): FSResult<Unit> {
        var statusCode: Int? = null
        val stdoutLineSequence = it.stdoutLineSequence().toList()
        for (line in stdoutLineSequence) {
            if (line.startsWith(EXIT)) {
                statusCode = line.split(":")[1].toInt()
            }
        }

        return FSResult(statusCode!!, Unit)
    }

    private fun createdOrModifiedFromRow(it: FileRow, eventCausedBy: String?): StorageEvent.CreatedOrRefreshed {
        return StorageEvent.CreatedOrRefreshed(
            id = it.inode,
            path = it.path,
            owner = it.xowner,
            creator = it.owner,
            timestamp = it.timestamps.modified,

            fileType = it.fileType,

            fileTimestamps = it.timestamps,
            size = it.size,

            isLink = it.isLink,
            linkTarget = if (it.isLink) it.linkTarget else null,
            linkTargetId = if (it.isLink) it.linkInode else null,

            sensitivityLevel = it.sensitivityLevel,

            eventCausedBy = eventCausedBy,

            annotations = emptySet(),
            checksum = FileChecksum("", "")
        )
    }

    //
    // File utility
    //

    private fun translateAndCheckFile(internalPath: String, isDirectory: Boolean = false): String {
        val userRoot = File(fsRoot, "home").absolutePath.removeSuffix("/") + "/"
        val path = File(fsRoot, internalPath)
            .normalize()
            .absolutePath
            .let { it + (if (isDirectory) "/" else "") }

        if (!path.startsWith(userRoot) && path.removeSuffix("/") != userRoot.removeSuffix("/")) throw IllegalArgumentException(
            "path ($path) is not in user-root"
        )
        if (path.contains("\n")) throw IllegalArgumentException("Path cannot contain new-lines")
        if (path.length >= PATH_MAX) throw IllegalArgumentException("Path is too long")

        return path
    }

    private fun String.toCloudPath(): String {
        return ("/" + substringAfter(fsRoot).removePrefix("/")).normalize()
    }

    private fun parseFileAttributes(
        sequence: Sequence<String>,
        attributes: Set<FileAttribute>
    ): Sequence<StatusTerminatedItem<FileRow>> {
        return parseFileAttributes(sequence.iterator(), attributes)
    }

    private fun processRequestedAttributes(requestedAttributes: Set<FileAttribute>): Set<FileAttribute> {
        if (FileAttribute.XOWNER in requestedAttributes) return requestedAttributes + setOf(FileAttribute.PATH)
        return requestedAttributes
    }

    private fun parseFileAttributes(
        iterator: Iterator<String>,
        attributes: Set<FileAttribute>
    ): Sequence<StatusTerminatedItem<FileRow>> {
        return fileAttributeParser.parse(iterator, attributes).map { item ->
            runBlocking {
                when (item) {
                    is StatusTerminatedItem.Item -> item.copy(
                        item = item.item.convertToCloud(attributes)
                    )

                    else -> item
                }
            }
        }
    }

    private fun FileRow.convertToCloud(attributes: Set<FileAttribute>): FileRow {
        fun normalizeShares(incoming: List<AccessEntry>): List<AccessEntry> {
            return incoming.mapNotNull {
                if (it.isGroup) {
                    it
                } else {
                    if (it.entity == SERVICE_UNIX_USER) null
                    else it
                }
            }
        }

        val realOwner = if (FileAttribute.XOWNER in attributes) {
            val realPath = path.toCloudPath()
            runBlocking { fileOwnerLookupService.lookupOwner(realPath) }
        } else {
            null
        }

        return FileRow(
            _fileType,
            _isLink,
            _linkTarget?.toCloudPath(),
            _unixMode,
            _owner,
            _group,
            _timestamps,
            _path?.toCloudPath(),
            _rawPath?.toCloudPath(),
            _inode,
            _size,
            _shares?.let { normalizeShares(it) },
            _sensitivityLevel,
            _linkInode,
            realOwner
        )
    }

    private inline fun <T, R> Sequence<StatusTerminatedItem<T>>.asFSResult(mapper: (T) -> R): FSResult<List<R>> {
        val rows = toList()
        val exit = rows.last() as StatusTerminatedItem.Exit
        return FSResult(
            exit.statusCode,
            rows.subList(
                0,
                rows.size - 1
            ).map { mapper((it as StatusTerminatedItem.Item).item) }
        )
    }

    private fun <T> Sequence<StatusTerminatedItem<T>>.asFSResult(): FSResult<List<T>> {
        val rows = toList()
        val exit = rows.last() as StatusTerminatedItem.Exit
        return FSResult(
            exit.statusCode,
            rows.subList(
                0,
                rows.size - 1
            ).map { (it as StatusTerminatedItem.Item).item }
        )
    }

    companion object : Loggable {
        override val log = logger()
        const val PATH_MAX = 1024

        private const val EXIT = "EXIT:"
        private const val ATTRIBUTE_PREFIX = "user."

        @Suppress("ObjectPropertyNaming")
        private val CREATED_OR_MODIFIED_ATTRIBUTES = setOf(
            FileAttribute.FILE_TYPE,
            FileAttribute.INODE,
            FileAttribute.PATH,
            FileAttribute.TIMESTAMPS,
            FileAttribute.OWNER,
            FileAttribute.XOWNER,
            FileAttribute.SIZE,
            FileAttribute.IS_LINK,
            FileAttribute.LINK_TARGET,
            FileAttribute.LINK_INODE,
            FileAttribute.SENSITIVITY
        )

        @Suppress("ObjectPropertyNaming")
        private val MOVED_ATTRIBUTES = setOf(
            FileAttribute.FILE_TYPE,
            FileAttribute.INODE,
            FileAttribute.PATH,
            FileAttribute.OWNER,
            FileAttribute.XOWNER
        )

        @Suppress("ObjectPropertyNaming")
        private val DELETED_ATTRIBUTES = setOf(
            FileAttribute.FILE_TYPE,
            FileAttribute.INODE,
            FileAttribute.OWNER,
            FileAttribute.XOWNER,
            FileAttribute.GROUP,
            FileAttribute.PATH
        )
    }
}
