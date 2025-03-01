package dk.sdu.cloud.contact.book.api

import dk.sdu.cloud.AccessRight
import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.Roles
import dk.sdu.cloud.calls.*
import io.ktor.http.HttpMethod
import kotlinx.serialization.Serializable

@Serializable
enum class ServiceOrigin {
    SHARE_SERVICE,
    PROJECT_SERVICE;
}

@Serializable
data class InsertRequest(
    val fromUser: String,
    val toUser: List<String>,
    val serviceOrigin: ServiceOrigin
)
typealias InsertResponse = Unit

@Serializable
data class DeleteRequest(
    val fromUser: String,
    val toUser: String,
    val serviceOrigin: ServiceOrigin
)
typealias DeleteResponse = Unit

@Serializable
data class QueryContactsRequest(
    val query: String,
    val serviceOrigin: ServiceOrigin
)

@Serializable
data class QueryContactsResponse(
    val contacts: List<String>
)

@Serializable
data class AllContactsForUserRequest(
    val serviceOrigin: ServiceOrigin
)
typealias AllContactsForUserResponse = QueryContactsResponse

@TSTopLevel
object ContactBookDescriptions : CallDescriptionContainer("contactbook") {
     const val baseContext = "/api/contactbook"

    val insert = call<InsertRequest, InsertResponse, CommonErrorMessage>("insert") {
        auth {
            roles = Roles.PRIVILEGED
            access = AccessRight.READ_WRITE
        }

        http {
            method = HttpMethod.Put

            path {
                using(baseContext)
            }

            body { bindEntireRequestFromBody() }
        }
    }

    val delete = call<DeleteRequest, DeleteResponse, CommonErrorMessage>("delete") {
        auth {
            roles = Roles.PRIVILEGED
            access = AccessRight.READ_WRITE
        }

        http {
            method = HttpMethod.Delete

            path {
                using(baseContext)
            }

            body { bindEntireRequestFromBody() }
        }
    }

    val listAllContactsForUser = call<
            AllContactsForUserRequest, AllContactsForUserResponse, CommonErrorMessage
            >("listAllContactsForUser") {
        auth {
            roles = Roles.AUTHENTICATED
            access = AccessRight.READ
        }

        http {
            method = HttpMethod.Post

            path {
                using(baseContext)
                +"all"
            }

            body { bindEntireRequestFromBody() }
        }
    }

    val queryUserContacts = call<QueryContactsRequest, QueryContactsResponse, CommonErrorMessage>("queryUserContacts") {
        auth {
            roles = Roles.AUTHENTICATED
            access = AccessRight.READ
        }

        http {
            method = HttpMethod.Post

            path {
                using(baseContext)
            }

            body { bindEntireRequestFromBody() }
        }
    }

}
