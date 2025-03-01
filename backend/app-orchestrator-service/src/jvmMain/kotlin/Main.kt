package dk.sdu.cloud.app.orchestrator

import dk.sdu.cloud.app.orchestrator.api.AppOrchestratorServiceDescription
import dk.sdu.cloud.auth.api.AuthenticatorFeature
import dk.sdu.cloud.micro.*
import dk.sdu.cloud.service.CommonServer

class Configuration(
    val provider: Provider = Provider()
)

data class Provider(
    val domain: String = "localhost",
    val https: Boolean = false,
    val port: Int = 8080
)

object AppOrchestratorService : Service {
    override val description = AppOrchestratorServiceDescription

    override fun initializeServer(micro: Micro): CommonServer {
        micro.install(BackgroundScopeFeature)
        micro.install(AuthenticatorFeature)

        val config = micro.configuration.requestChunkOrNull("app") ?: Configuration()
        return Server(micro, config)
    }
}

fun main(args: Array<String>) {
    AppOrchestratorService.runAsStandalone(args)
}
