package dk.sdu.cloud.file.trash

import dk.sdu.cloud.auth.api.AuthenticatorFeature
import dk.sdu.cloud.file.trash.api.FileTrashServiceDescription
import dk.sdu.cloud.micro.*
import dk.sdu.cloud.micro.Micro
import dk.sdu.cloud.micro.install
import dk.sdu.cloud.service.CommonServer

object FileTrashService : Service {
    override val description = FileTrashServiceDescription

    override fun initializeServer(micro: Micro): CommonServer {
        micro.install(AuthenticatorFeature)
        micro.install(BackgroundScopeFeature)
        return Server(micro)
    }
}

fun main(args: Array<String>) {
    FileTrashService.runAsStandalone(args)
}
