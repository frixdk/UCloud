package dk.sdu.cloud.file.stats

import dk.sdu.cloud.auth.api.AuthenticatorFeature
import dk.sdu.cloud.file.stats.api.FileStatsServiceDescription
import dk.sdu.cloud.micro.*
import dk.sdu.cloud.service.CommonServer

object FileStatsService : Service {
    override val description = FileStatsServiceDescription

    override fun initializeServer(micro: Micro): CommonServer {
        micro.install(AuthenticatorFeature)

        return Server(micro)
    }
}

fun main(args: Array<String>) {
    FileStatsService.runAsStandalone(args)
}
