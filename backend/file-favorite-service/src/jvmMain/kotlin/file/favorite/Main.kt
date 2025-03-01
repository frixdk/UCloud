package dk.sdu.cloud.file.favorite

import dk.sdu.cloud.auth.api.AuthenticatorFeature
import dk.sdu.cloud.file.favorite.api.FileFavoriteServiceDescription
import dk.sdu.cloud.micro.*
import dk.sdu.cloud.service.CommonServer

object FileFavoriteService : Service {
    override val description = FileFavoriteServiceDescription

    override fun initializeServer(micro: Micro): CommonServer {
        micro.install(AuthenticatorFeature)
        return Server(micro)
    }
}

fun main(args: Array<String>) {
    FileFavoriteService.runAsStandalone(args)
}
