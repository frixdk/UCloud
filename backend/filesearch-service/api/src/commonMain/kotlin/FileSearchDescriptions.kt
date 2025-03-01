package dk.sdu.cloud.filesearch.api

import dk.sdu.cloud.AccessRight
import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.Page
import dk.sdu.cloud.WithPaginationRequest
import dk.sdu.cloud.calls.*
import dk.sdu.cloud.file.api.FileType
import dk.sdu.cloud.file.api.StorageFile
import io.ktor.http.HttpMethod
import kotlinx.serialization.Serializable

/**
 * @see FileSearchDescriptions.advancedSearch
 */
@Serializable
data class AdvancedSearchRequest(
    val fileName: String? = null,
    val extensions: List<String>? = null,
    val fileTypes: List<FileType>? = null,

    val includeShares: Boolean? = null,

    override val itemsPerPage: Int? = null,
    override val page: Int? = null,
) : WithPaginationRequest

typealias SearchResult = StorageFile

/**
 * Contains REST calls for searching in files
 */
@TSTopLevel
object FileSearchDescriptions : CallDescriptionContainer("fileSearch") {
    const val baseContext: String = "/api/file-search"

    val advancedSearch = call<AdvancedSearchRequest, Page<SearchResult>, CommonErrorMessage>("advancedSearch") {
        auth {
            access = AccessRight.READ
        }

        http {
            method = HttpMethod.Post

            path {
                using(baseContext)
                +"advanced"
            }

            body { bindEntireRequestFromBody() }
        }
    }
}
