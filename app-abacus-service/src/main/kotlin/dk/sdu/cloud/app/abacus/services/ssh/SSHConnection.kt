package dk.sdu.cloud.app.abacus.services.ssh

import com.jcraft.jsch.ChannelExec
import com.jcraft.jsch.ChannelSftp
import com.jcraft.jsch.Session
import dk.sdu.cloud.service.Loggable
import java.io.File
import java.io.Reader
import java.io.StringWriter
import java.io.Writer

data class SimpleSSHConfig(
    val server: String,
    val port: Int,
    val keyName: String,
    val user: String,
    val keyPassword: String,
    val keyHome: String = System.getProperty("user.home") + File.separator + ".ssh"
) {
    override fun toString(): String {
        return "SimpleSSHConfig(server='$server', port=$port, user='$user')"
    }
}

private const val CHARLIMIT_DEFAULT = 1024L * 1024L

class SSHConnection(val session: Session) {
    fun openExecChannel(): ChannelExec = session.openChannel("exec") as ChannelExec
    fun openSFTPChannel(): ChannelSftp = session.openChannel("sftp") as ChannelSftp

    suspend fun <T> exec(command: String, body: suspend ChannelExec.() -> T): Pair<Int, T> =
        openExecChannel().run {
            setCommand(command)
            connect()
            val res = try {
                body()
            } finally {
                disconnect()
                awaitClosed()
            }

            // TODO Not sure why this sometimes comes back (incorrectly) as -1.
            // But it appears to always be ok when it does
            val fixedStatus = if (exitStatus == -1) 0 else exitStatus
            Pair(fixedStatus, res)
        }

    suspend fun execWithOutputAsText(command: String, charLimit: Long = CHARLIMIT_DEFAULT): Pair<Int, String> =
        exec(command) {
            log.debug("Running command: $command")
            inputStream.bufferedReader().use {
                val buffer = StringWriter()
                it.copyTo(buffer, limit = charLimit)
                buffer.toString()
            }
        }

    private fun Reader.copyTo(out: Writer, bufferSize: Int = DEFAULT_BUFFER_SIZE, limit: Long = 0L): Long {
        var charsCopied: Long = 0
        val buffer = CharArray(bufferSize)
        var chars = read(buffer)
        while (chars >= 0) {
            out.write(buffer, 0, chars)
            charsCopied += chars
            chars = read(buffer)
            if (limit != 0L && charsCopied >= limit) {
                log.info("Went above the character limit ($limit). Aborting...")
                break
            }
        }
        return charsCopied
    }

    companion object : Loggable {
        override val log = logger()
    }
}

fun ChannelExec.awaitClosed(timeout: Long = 1000, pollRate: Long = 10): Boolean {
    val deadline = System.currentTimeMillis() + timeout
    while (System.currentTimeMillis() < deadline && !isClosed) {
        Thread.sleep(pollRate)
    }
    return isClosed
}
