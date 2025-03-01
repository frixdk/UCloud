package dk.sdu.cloud.file.favorite.services

import com.fasterxml.jackson.annotation.JsonProperty
import dk.sdu.cloud.SecurityPrincipalToken
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.calls.client.AuthenticatedClient
import dk.sdu.cloud.calls.client.call
import dk.sdu.cloud.calls.client.orNull
import dk.sdu.cloud.calls.client.orThrow
import dk.sdu.cloud.defaultMapper
import dk.sdu.cloud.file.api.*
import dk.sdu.cloud.paginate
import dk.sdu.cloud.service.Loggable
import dk.sdu.cloud.service.NormalizedPaginationRequest
import dk.sdu.cloud.service.Page
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString

@Serializable
data class FavoritePayload(
    @get:JsonProperty("isFavorite")
    val isFavorite: Boolean
)

class FileFavoriteService(
    private val serviceClient: AuthenticatedClient
) {
    suspend fun toggleFavorite(
        files: List<String>,
        user: SecurityPrincipalToken,
        userCloud: AuthenticatedClient
    ): List<String> {
        // Note: This function must ensure that the user has the correct privileges to the file!
        val failures = ArrayList<String>()
        files.forEach { path ->
            try {
                FileDescriptions.stat.call(
                    StatRequest(path, attributes = "${StorageFileAttribute.path}"),
                    userCloud
                ).orThrow()

                val isFavorite: Boolean = runCatching {
                    val payload = MetadataDescriptions.findMetadata.call(
                        FindMetadataRequest(path, FAVORITE_METADATA_TYPE, user.principal.username),
                        serviceClient
                    ).orNull()?.metadata?.singleOrNull()?.jsonPayload ?: return@runCatching false

                    defaultMapper.decodeFromString<FavoritePayload>(payload).isFavorite
                }.getOrElse { ex ->
                    log.info(ex.stackTraceToString())
                    false
                }

                if (isFavorite) {
                    MetadataDescriptions.removeMetadata.call(
                        RemoveMetadataRequest(
                            listOf(
                                FindMetadataRequest(
                                    path,
                                    FAVORITE_METADATA_TYPE,
                                    user.principal.username
                                )
                            )
                        ),
                        serviceClient
                    ).orThrow()
                } else {
                    MetadataDescriptions.updateMetadata.call(
                        UpdateMetadataRequest(
                            listOf(
                                MetadataUpdate(
                                    path,
                                    FAVORITE_METADATA_TYPE,
                                    user.principal.username,
                                    defaultMapper.encodeToString(FavoritePayload(!isFavorite))
                                )
                            )
                        ),
                        serviceClient
                    ).orThrow()
                }
            } catch (e: RPCException) {
                log.debug(e.stackTraceToString())
                failures.add(path)
            }
        }
        return failures
    }

    suspend fun getFavoriteStatus(files: List<String>, user: SecurityPrincipalToken): Map<String, Boolean> {
        val allMetadata = MetadataDescriptions.findMetadata.call(
            FindMetadataRequest(null, FAVORITE_METADATA_TYPE, user.principal.username),
            serviceClient
        ).orThrow()

        val filesSet = files.map { it.normalize() }.toSet()

        val result = HashMap<String, Boolean>()
        files.forEach { result[it.normalize()] = false }

        allMetadata.metadata
            .asSequence()
            .filter { it.path.normalize() in filesSet }
            .forEach {
                val isFavorite =
                    runCatching { defaultMapper.decodeFromString<FavoritePayload>(it.jsonPayload) }
                        .getOrNull()?.isFavorite
                if (isFavorite != null) {
                    result[it.path.normalize()] = isFavorite
                }
            }

        return result
    }

    suspend fun listAll(
        pagination: NormalizedPaginationRequest,
        user: SecurityPrincipalToken,
        userClient: AuthenticatedClient,
        project: String? = null
    ): Page<StorageFile> {
        val allMetadata = MetadataDescriptions.findMetadata.call(
            FindMetadataRequest(null, FAVORITE_METADATA_TYPE, user.principal.username),
            serviceClient
        ).orThrow()

        return allMetadata.metadata
            .filter {
                val shouldStartWith = if (project == null) {
                    "/home/"
                } else {
                    projectHomeDirectory(project)
                }

                it.path.normalize().startsWith(shouldStartWith)
            }
            .paginate(pagination)
            .run {
                val newItems = items.mapNotNull { metadata ->
                    FileDescriptions.stat.call(
                        StatRequest(metadata.path),
                        userClient
                    ).orNull()
                }

                Page(itemsInTotal, itemsPerPage, pageNumber, newItems)
            }
    }

    companion object : Loggable {
        override val log = logger()

        const val FAVORITE_METADATA_TYPE = "favorite"
    }
}
