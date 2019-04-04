package dk.sdu.cloud.file

import dk.sdu.cloud.file.api.AccessRight
import dk.sdu.cloud.file.services.FSACLEntity
import dk.sdu.cloud.file.services.FileAttribute
import dk.sdu.cloud.file.services.StorageUserDao
import dk.sdu.cloud.file.services.linuxfs.LinuxFS
import dk.sdu.cloud.file.services.linuxfs.LinuxFSRunner
import dk.sdu.cloud.file.util.unwrap
import dk.sdu.cloud.storage.api.StorageServiceDescription
import kotlinx.coroutines.runBlocking
import java.io.File

val SERVICE_USER = "_${StorageServiceDescription.name}"
const val SERVICE_UNIX_USER = "storage" // Note: root is also supported. Should only be done in a container

data class StorageConfiguration(
    val filePermissionAcl: Set<String> = emptySet()
)

fun main(args: Array<String>) {
    /*
    val micro = Micro().apply {
        init(StorageServiceDescription, args)
        installDefaultFeatures(
            kafkaTopicConfig = KafkaTopicFeatureConfiguration(
                discoverDefaults = true,
                basePackages = listOf("dk.sdu.cloud.file.api")
            )
        )
        install(HibernateFeature)
        install(RefreshingJWTCloudFeature)
    }

    if (micro.runScriptHandler()) return

    val config = micro.configuration.requestChunkAtOrNull("storage") ?: StorageConfiguration()

    Server(
        config,
        micro
    ).start()
    */

    val userDao = object : StorageUserDao<Long> {
        private val map = mapOf<String, Long>(
            "dan" to 1,
            "fie" to 2,
            "alonzo" to 3
        )

        override suspend fun findCloudUser(uid: Long, verify: Boolean): String? {
            return map.entries.find { it.value == uid }?.key
        }

        override suspend fun findStorageUser(cloudUser: String, verify: Boolean): Long? {
            return map[cloudUser]
        }

    }

    val runner = LinuxFSRunner(userDao, "dan")
    val fs = LinuxFS(File("/tmp/fs"), userDao)

    runBlocking {
        runner.use {
            fs.listDirectory(runner, "/home/dan", FileAttribute.values().toSet()).unwrap().forEach {
                println(it)
            }

            fs.createACLEntry(runner, "/home/dan/a", FSACLEntity.User("alonzo"), setOf(AccessRight.READ))
        }
    }
}
