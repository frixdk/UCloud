package dk.sdu.cloud.micro

import dk.sdu.cloud.ServiceDescription
import org.apache.logging.log4j.core.config.ConfigurationFactory

fun Micro.installDefaultFeatures() {
    install(DeinitFeature)
    install(ScriptFeature)
    install(ConfigurationFeature)
    install(ServiceDiscoveryOverrides)
    install(ServiceInstanceFeature)
    install(DevelopmentOverrides)
    install(LogFeature)
    install(KtorServerProviderFeature)
    install(RedisFeature)
    install(ClientFeature)
    install(TokenValidationFeature)
    install(ServerFeature)
    install(DatabaseConfigurationFeature)
    install(FlywayFeature)
}

fun Micro.initWithDefaultFeatures(
    description: ServiceDescription,
    cliArgs: Array<String>
) {
    init(description, cliArgs)
    installDefaultFeatures()
}

fun Micro(): Micro {
    // Hack for backwards compatibility
    return Micro(null) { ConfigurationFactory.setConfigurationFactory(Log4j2ConfigFactory) }
}
