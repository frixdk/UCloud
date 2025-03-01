package dk.sdu.cloud.alerting

import dk.sdu.cloud.alerting.api.AlertingServiceDescription
import dk.sdu.cloud.auth.api.AuthenticatorFeature
import dk.sdu.cloud.micro.ElasticFeature
import dk.sdu.cloud.micro.HealthCheckFeature
import dk.sdu.cloud.micro.Micro
import dk.sdu.cloud.micro.configuration
import dk.sdu.cloud.micro.initWithDefaultFeatures
import dk.sdu.cloud.micro.install
import dk.sdu.cloud.micro.runScriptHandler

data class Configuration (
    val limits: Limits? = null,
    val omissions: Omission? = null
)

data class Limits(
    val percentLimit500Status: Double,
    val storageInfoLimit: Double,
    val storageWarnLimit: Double,
    val storageCriticalLimit: Double,
    val alertWhenNumberOfShardsAvailableIsLessThan: Int?,
    val limitFor4xx: Int?,
    val limitFor5xx: Int?,
    val indexFor4xx: String?
)

data class Omission(
    val whiteListedIPs: List<String>?
)

fun main(args: Array<String>) {
    val micro = Micro().apply {
        initWithDefaultFeatures(AlertingServiceDescription, args)
        install(AuthenticatorFeature)
        install(ElasticFeature)
        install(HealthCheckFeature)
    }

    if (micro.runScriptHandler()) return

    val config = micro.configuration.requestChunkAt<Configuration>("alerting")

    Server(config, micro).start()
}
