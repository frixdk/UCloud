package dk.sdu.cloud.file.util

import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.calls.server.CallHandler
import dk.sdu.cloud.file.api.LongRunningResponse
import dk.sdu.cloud.file.api.favoritesDirectory
import dk.sdu.cloud.file.api.homeDirectory
import dk.sdu.cloud.file.services.FSCommandRunnerFactory
import dk.sdu.cloud.file.services.FSResult
import dk.sdu.cloud.file.services.FSUserContext
import dk.sdu.cloud.file.services.withContext
import dk.sdu.cloud.service.stackTraceToString
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.selects.select
import org.slf4j.LoggerFactory
import kotlin.math.absoluteValue

fun homeDirectory(ctx: FSUserContext): String = homeDirectory(ctx.user)

fun favoritesDirectory(ctx: FSUserContext): String = favoritesDirectory(ctx.user)

fun <T> FSResult<T>.unwrap(): T {
    if (statusCode != 0) {
        throwExceptionBasedOnStatus(statusCode)
    } else {
        return value
    }
}

private const val OPERATION_NOT_PERMITED = 1
private const val NO_SUCH_FILE_OR_DIR = 2
private const val IO_ERROR = 5
private const val NO_SUCH_DEVICE_OR_ADDRESS = 6
private const val PERMISSION_DENIED = 13
private const val DEVICE_OR_RESOURCE_BUSY = 16
private const val FILE_EXISTS = 17
private const val NO_SUCH_DEVICE = 19
private const val NOT_A_DIRECTORY = 20
private const val IS_A_DIRECTORY = 21
private const val INVALID_ARGUMENT = 22
private const val FILE_TABLE_OVERFLOW = 23
private const val TOO_MANY_OPEN_FILES = 24
private const val FILE_TOO_LARGE = 27
private const val NO_SPACE_LEFT_ON_DEVICE = 28
private const val READ_ONLY_FILE_SYSTEM = 30
private const val TOO_MANY_LINKS = 31
private const val DIRECTORY_NOT_EMPTY = 39
private const val PROTOCOL_NOT_SUPPORTED = 93

// Observed on OSX. Code doesn't really makes sense [DIRECTORY_NOT_EMPTY] would make more sense.
private const val OBJECT_IS_REMOTE = 66


fun throwExceptionBasedOnStatus(status: Int): Nothing {
    when (status.absoluteValue) {
        OBJECT_IS_REMOTE, DIRECTORY_NOT_EMPTY, OPERATION_NOT_PERMITED, NOT_A_DIRECTORY,
        INVALID_ARGUMENT -> throw FSException.BadRequest()

        IS_A_DIRECTORY -> throw FSException.IsDirectoryConflict()

        NO_SUCH_FILE_OR_DIR, PROTOCOL_NOT_SUPPORTED -> throw FSException.NotFound()

        IO_ERROR, NO_SUCH_DEVICE_OR_ADDRESS, DEVICE_OR_RESOURCE_BUSY,
        NO_SUCH_DEVICE, FILE_TABLE_OVERFLOW, TOO_MANY_OPEN_FILES, FILE_TOO_LARGE,
        NO_SPACE_LEFT_ON_DEVICE, READ_ONLY_FILE_SYSTEM, TOO_MANY_LINKS -> throw FSException.IOException()

        PERMISSION_DENIED -> throw FSException.PermissionException()

        FILE_EXISTS -> throw FSException.AlreadyExists()

        else -> throw FSException.CriticalException("Unknown status code $status")
    }
}

sealed class FSException(why: String, httpStatusCode: HttpStatusCode) : RPCException(why, httpStatusCode) {
    class NotReady : FSException("File system is not ready yet", HttpStatusCode.ExpectationFailed)
    class BadRequest(why: String = "") : FSException("Bad request $why", HttpStatusCode.BadRequest)
    class NotFound(val file: String? = null) : FSException("Not found ${file ?: ""}", HttpStatusCode.NotFound)
    class AlreadyExists(val file: String? = null) : FSException("Already exists ${file ?: ""}", HttpStatusCode.Conflict)
    class PermissionException : FSException("Permission denied", HttpStatusCode.Forbidden)
    class CriticalException(why: String) : FSException("Critical exception: $why", HttpStatusCode.InternalServerError)
    class IOException : FSException("Internal server error (IO)", HttpStatusCode.InternalServerError)
    class IsDirectoryConflict : FSException("File cannot overwrite directory.", HttpStatusCode.Conflict)
}

@Deprecated("Deprecated")
suspend inline fun CallHandler<*, *, CommonErrorMessage>.tryWithFS(
    body: () -> Unit
) {
    try {
        body()
    } catch (ex: Exception) {
        fsLog.debug(ex.stackTraceToString())
        val (msg, status) = handleFSException(ex)
        error(msg, status)
    }
}

@Deprecated("Deprecated")
suspend inline fun <Ctx : FSUserContext> CallHandler<*, *, CommonErrorMessage>.tryWithFS(
    factory: FSCommandRunnerFactory<Ctx>,
    user: String,
    body: (Ctx) -> Unit
) {
    try {
        factory.withContext(user) { body(it) }
    } catch (ex: Exception) {
        fsLog.debug(ex.stackTraceToString())
        val (msg, status) = handleFSException(ex)
        error(msg, status)
    }
}

sealed class CallResult<S, E>(val status: HttpStatusCode) {
    class Success<S, E>(val item: S, status: HttpStatusCode = HttpStatusCode.OK) : CallResult<S, E>(status)
    class Error<S, E>(val item: E, status: HttpStatusCode) : CallResult<S, E>(status)
}

@Deprecated("Deprecated")
fun handleFSException(ex: Exception): Pair<CommonErrorMessage, HttpStatusCode> {
    return when (ex) {
        is IllegalArgumentException -> {
            Pair(CommonErrorMessage("Bad request"), HttpStatusCode.BadRequest)
        }

        is TooManyRetries -> {
            handleFSException(ex.causes.first())
        }

        is RPCException -> throw ex

        else -> {
            fsLog.warn("Unknown FS exception!")
            fsLog.warn(ex.stackTraceToString())
            Pair(CommonErrorMessage("Internal server error"), HttpStatusCode.InternalServerError)
        }
    }
}

val fsLog = LoggerFactory.getLogger("dk.sdu.cloud.storage.services.FileSystemServiceKt")!!
