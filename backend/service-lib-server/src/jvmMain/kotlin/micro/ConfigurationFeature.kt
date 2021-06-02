package dk.sdu.cloud.micro

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.jacksonTypeRef
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import dk.sdu.cloud.ServiceDescription
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.service.Loggable
import io.ktor.http.HttpStatusCode
import java.io.File

class ConfigurationFeature : MicroFeature {
    override fun init(ctx: Micro, serviceDescription: ServiceDescription, cliArgs: List<String>) {
        val allConfigFiles = ArrayList<File>()
        if (ctx.commandLineArguments.contains("--dev") && !ctx.commandLineArguments.contains("--no-implicit-config")) {
            run {
                val defaultConfigDir = File(System.getProperty("user.home"), "sducloud")
                if (defaultConfigDir.exists() && defaultConfigDir.isDirectory) {
                    log.info("Using files from default configuration directory: ${defaultConfigDir.absolutePath}")
                    allConfigFiles.addAll(addFilesFromDirectory(defaultConfigDir))
                }
            }
            run {
                val defaultConfigDir = File(System.getProperty("user.home"), "ucloud")
                if (defaultConfigDir.exists() && defaultConfigDir.isDirectory) {
                    log.info("Using files from default configuration directory: ${defaultConfigDir.absolutePath}")
                    allConfigFiles.addAll(addFilesFromDirectory(defaultConfigDir))
                }
            }
        }

        val configDirs = ArrayList<File>()
        val argIterator = cliArgs.iterator()
        while (argIterator.hasNext()) {
            val arg = argIterator.next()

            if (arg == "--config") {
                val configFile = if (argIterator.hasNext()) argIterator.next() else null
                if (configFile == null) {
                    log.info("Dangling --config. Correct syntax is --config <file>")
                } else {
                    allConfigFiles.add(File(configFile))
                }
            } else if (arg == "--config-dir") {
                val configDirectory = (if (argIterator.hasNext()) argIterator.next() else null)?.let { File(it) }
                if (configDirectory == null) {
                    log.info("Dangling --config-dir. Correct syntax is --config-dir <directory>")
                } else {
                    configDirs.add(configDirectory)
                    if (configDirectory.exists() && configDirectory.isDirectory) {
                        allConfigFiles.addAll(addFilesFromDirectory(configDirectory))
                    }
                }
            }
        }

        val tree = jsonMapper.readTree("{}")
        val serverConfiguration = ServerConfiguration(jsonMapper, tree, configDirs)
        for (configFile in allConfigFiles) {
            injectFile(serverConfiguration, configFile)
        }

        // NOTE: This is not meant to be recursive.
        val additionalDirs =
            serverConfiguration.requestChunkAtOrNull<List<String>>("config", "additionalDirectories") ?: emptyList()
        for (additionalDir in additionalDirs) {
            for (file in (File(additionalDir).listFiles() ?: emptyArray())) {
                if (file.extension !in knownExtensions) continue
                injectFile(serverConfiguration, file)
            }
        }

        ctx.configuration = serverConfiguration
    }

    private fun addFilesFromDirectory(configDirectory: File) =
        configDirectory.listFiles()?.filter { it.extension in knownExtensions } ?: emptyList()

    fun injectFile(configuration: ServerConfiguration, configFile: File) {
        log.debug("Reading from configuration file: ${configFile.absolutePath}")

        if (!configFile.exists()) {
            log.info("Could not find configuration file: ${configFile.absolutePath}")
            return
        }

        val mapper = when (configFile.extension) {
            "yml", "yaml" -> yamlMapper
            "json" -> jsonMapper
            else -> jsonMapper
        }

        configuration.tree.mergeWith(mapper.readTree(configFile))
    }

    fun manuallyInjectNode(configuration: ServerConfiguration, node: JsonNode) {
        log.debug("Manually injecting node into configuration")
        configuration.tree.mergeWith(node)
    }

    private fun JsonNode.mergeWith(updateNode: JsonNode) {
        val mainNode: JsonNode = this

        updateNode.fieldNames().forEach { fieldName ->
            val mainJsonNode: JsonNode? = mainNode.get(fieldName)
            val updateJsonNode: JsonNode? = updateNode.get(fieldName)

            when {
                mainNode is ObjectNode &&
                        mainJsonNode?.isObject == true &&
                        updateJsonNode?.isObject == false -> {
                    mainNode.set(fieldName, updateJsonNode)
                }

                mainJsonNode?.isObject == true -> {
                    mainJsonNode.mergeWith(updateNode.get(fieldName))
                }

                mainJsonNode is ArrayNode && updateJsonNode is ArrayNode -> {
                    mainJsonNode.addAll(updateJsonNode)
                }

                mainNode is ObjectNode -> {
                    mainNode.set(fieldName, updateJsonNode)
                }
            }
        }
    }

    companion object Feature : MicroFeatureFactory<ConfigurationFeature, Unit>,
        Loggable {
        override val key: MicroAttributeKey<ConfigurationFeature> =
            MicroAttributeKey("configuration-feature")

        override fun create(config: Unit): ConfigurationFeature =
            ConfigurationFeature()

        override val log = logger()

        private val jsonMapper = ObjectMapper().apply { basicConfig() }
        private val yamlMapper = ObjectMapper(YAMLFactory()).apply { basicConfig() }

        private fun ObjectMapper.basicConfig() {
            registerKotlinModule()
            configure(JsonParser.Feature.ALLOW_COMMENTS, true)
            configure(JsonParser.Feature.ALLOW_MISSING_VALUES, true)
            configure(JsonParser.Feature.ALLOW_TRAILING_COMMA, true)
            configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            configure(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES, false)
        }

        private val knownExtensions = listOf("yml", "yaml", "json")
    }
}
