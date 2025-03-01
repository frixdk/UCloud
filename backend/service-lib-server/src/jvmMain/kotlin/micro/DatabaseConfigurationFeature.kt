package dk.sdu.cloud.micro

import dk.sdu.cloud.ServiceDescription
import dk.sdu.cloud.service.Loggable
import dk.sdu.cloud.service.findValidHostname
import java.util.concurrent.atomic.AtomicBoolean

fun safeSchemaName(service: ServiceDescription): String = service.name.replace('-', '_')

fun postgresJdbcUrl(host: String, database: String, port: Int? = null): String {
    return StringBuilder().apply {
        append("jdbc:postgresql://")
        append(host)
        if (port != null) {
            append(':')
            append(port)
        }
        append('/')
        append(database)
    }.toString()
}

class DatabaseConfigurationFeature : MicroFeature {
    override fun init(ctx: Micro, serviceDescription: ServiceDescription, cliArgs: List<String>) {
        ctx.requireFeature(ConfigurationFeature)

        fun invalidConfig(why: String): Nothing =
            throw IllegalStateException("$why. Please provide it in configuration at ${CONFIG_PATH.toList()}")

        val shouldLog = didLog.compareAndSet(false, true)

        val configuration =
            ctx.configuration.requestChunkAtOrNull(*CONFIG_PATH)
                ?: ctx.configuration.requestChunkAtOrNull(*OLD_CONFIG_PATH) ?: run {
                    if (shouldLog) log.warn(
                        "No database configuration provided at ${CONFIG_PATH.toList()}. " +
                                "Will fall back to default test (non-persistent) database."
                    )

                    Config()
                }

        when (configuration.profile) {
            Profile.PERSISTENT_POSTGRES -> {
                val credentials = configuration.credentials
                    ?: invalidConfig("Cannot connect to postgres without credentials")

                val hostname = configuration.hostname ?: run {
                    if (shouldLog) log.trace(
                        "No hostname given in configuration. Looking for valid hostname: " +
                                "$postgresExpectedHostnames"
                    )

                    findValidHostname(postgresExpectedHostnames)
                } ?: throw IllegalStateException("Could not find a valid host")

                val database = configuration.database ?: "postgres"
                val port = configuration.port
                val jdbcUrl = postgresJdbcUrl(hostname, database, port)

                ctx.jdbcUrl = jdbcUrl
                ctx.databaseConfig = DatabaseConfig(
                    jdbcUrl,
                    credentials.username,
                    credentials.password,
                    safeSchemaName(ctx.serviceDescription),
                    recreateSchema = false
                )

                if (shouldLog) {
                    log.info("Using postgresql database at $hostname. " +
                        "Config is loaded from ${CONFIG_PATH.joinToString("/")}.")
                }
            }
        }
    }

    companion object Feature : Loggable, MicroFeatureFactory<DatabaseConfigurationFeature, Unit> {
        override val log = logger()

        internal val JDBC_KEY = MicroAttributeKey<String>("jdbc-url")
        internal val CONFIG_KEY = MicroAttributeKey<DatabaseConfig>("db-config")

        // Config chunks
        val OLD_CONFIG_PATH = arrayOf("hibernate", "database")
        val CONFIG_PATH = arrayOf("database")

        enum class Profile {
            PERSISTENT_POSTGRES
        }

        data class Credentials(val username: String, val password: String)

        data class Config(
            val profile: Profile = Profile.PERSISTENT_POSTGRES,
            val hostname: String? = null,
            val credentials: Credentials? = null,
            val database: String? = null,
            val port: Int? = null,
            val logSql: Boolean = false
        )

        // Postgres profile
        private val postgresExpectedHostnames = listOf(
            "postgres",
            "localhost"
        )
        override val key: MicroAttributeKey<DatabaseConfigurationFeature> = MicroAttributeKey("database-config")

        override fun create(config: Unit): DatabaseConfigurationFeature = DatabaseConfigurationFeature()
        private val didLog = AtomicBoolean(false)
    }
}

var Micro.jdbcUrl: String
    get() {
        requireFeature(DatabaseConfigurationFeature)
        return attributes[DatabaseConfigurationFeature.JDBC_KEY]
    }
    internal set(value) {
        attributes[DatabaseConfigurationFeature.JDBC_KEY] = value
    }

var Micro.databaseConfig: DatabaseConfig
    get() {
        requireFeature(DatabaseConfigurationFeature)
        return attributes[DatabaseConfigurationFeature.CONFIG_KEY]
    }
    internal set(value) {
        attributes[DatabaseConfigurationFeature.CONFIG_KEY] = value
    }

data class DatabaseConfig(
    val jdbcUrl: String?,
    val username: String?,
    val password: String?,
    val defaultSchema: String,
    val recreateSchema: Boolean,
    val usePool: Boolean = true,
    val poolSize: Int? = 50
)
