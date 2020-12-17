package dk.sdu.cloud.app.orchestrator.api

import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.accounting.api.Product
import dk.sdu.cloud.accounting.api.ProductReference
import dk.sdu.cloud.calls.*
import dk.sdu.cloud.service.PageV2
import dk.sdu.cloud.service.PaginationRequestV2Consistency
import dk.sdu.cloud.service.WithPaginationRequestV2
import io.ktor.http.*

// Data model
interface LicenseId {
    val id: String
}

fun LicenseId(id: String): LicenseId = LicenseRetrieve(id)
data class LicenseRetrieve(override val id: String) : LicenseId

data class LicenseRetrieveWithFlags(
    override val id: String,
    override val includeUpdates: Boolean? = null,
    override val includeProduct: Boolean? = null,
) : LicenseDataIncludeFlags, LicenseId

interface LicenseDataIncludeFlags {
    @UCloudApiDoc("Includes `updates`")
    val includeUpdates: Boolean?

    @UCloudApiDoc("Includes `resolvedProduct`")
    val includeProduct: Boolean?
}

data class LicenseDataIncludeFlagsImpl(
    override val includeUpdates: Boolean?,
    override val includeProduct: Boolean?
) : LicenseDataIncludeFlags

fun LicenseDataIncludeFlags(
    includeUpdates: Boolean? = null,
    includeProduct: Boolean? = null,
): LicenseDataIncludeFlags = LicenseDataIncludeFlagsImpl(includeUpdates, includeProduct)

interface LicenseSpecification {
    @UCloudApiDoc("The product used for the `License`")
    val product: ProductReference
}

@UCloudApiExperimental(ExperimentalLevel.ALPHA)
@UCloudApiDoc("A `License` for use in `Job`s")
data class License(
    override val id: String,

    override val product: ProductReference,

    @UCloudApiDoc("Information about the owner of this resource")
    val owner: LicenseOwner,

    @UCloudApiDoc("Information about when this resource was created")
    val createdAt: Long,

    @UCloudApiDoc("The current status of this resource")
    val status: LicenseStatus,

    @UCloudApiDoc("Billing information associated with this `License`")
    val billing: LicenseBilling,

    @UCloudApiDoc("A list of updates for this `License`")
    val updates: List<LicenseUpdate> = emptyList(),

    val resolvedProduct: Product.License? = null
) : LicenseSpecification, LicenseId

data class LicenseBilling(
    val pricePerUnit: Long,
    val creditsCharged: Long
)

@UCloudApiDoc("The status of an `License`")
data class LicenseStatus(
    val state: LicenseState
)

@UCloudApiExperimental(ExperimentalLevel.ALPHA)
enum class LicenseState {
    @UCloudApiDoc(
        "A state indicating that the `License` is currently being prepared and is expected to reach `READY` soon."
    )
    PREPARING,

    @UCloudApiDoc("A state indicating that the `License` is ready for use or already in use.")
    READY,

    @UCloudApiDoc(
        "A state indicating that the `License` is currently unavailable.\n\n" +
            "This state can be used to indicate downtime or service interruptions by the provider."
    )
    UNAVAILABLE
}

@UCloudApiExperimental(ExperimentalLevel.ALPHA)
data class LicenseUpdate(
    @UCloudApiDoc("A timestamp for when this update was registered by UCloud")
    val timestamp: Long,

    @UCloudApiDoc("The new state that the `License` transitioned to (if any)")
    val state: LicenseState? = null,

    @UCloudApiDoc("A new status message for the `License` (if any)")
    val status: String? = null,
)

data class LicenseOwner(
    @UCloudApiDoc(
        "The username of the user which created this resource.\n\n" +
            "In cases where this user is removed from the project the ownership will be transferred to the current " +
            "PI of the project."
    )
    val username: String,

    @UCloudApiDoc("The project which owns the resource")
    val project: String? = null
)

interface LicenseFilters {
    val provider: String?
    val tag: String?

    fun validateFilters() {
        if (tag != null && provider == null)
            throw RPCException("'provider' must be supplied if 'tag' is supplied", HttpStatusCode.BadRequest)
    }
}

// Request and response types
data class LicensesBrowseRequest(
    override val includeUpdates: Boolean? = null,
    override val includeProduct: Boolean? = null,
    override val itemsPerPage: Int? = null,
    override val next: String? = null,
    override val consistency: PaginationRequestV2Consistency? = null,
    override val itemsToSkip: Long? = null,
    override val provider: String? = null,
    override val tag: String? = null,
) : LicenseDataIncludeFlags, LicenseFilters, WithPaginationRequestV2 {
    init {
        validateFilters()
    }
}
typealias LicensesBrowseResponse = PageV2<License>

typealias LicensesCreateRequest = BulkRequest<LicenseCreateRequestItem>

data class LicenseCreateRequestItem(
    override val product: ProductReference
) : LicenseSpecification
data class LicensesCreateResponse(val ids: List<String>)

typealias LicensesDeleteRequest = BulkRequest<LicenseRetrieve>
typealias LicensesDeleteResponse = Unit

typealias LicensesRetrieveRequest = LicenseRetrieveWithFlags
typealias LicensesRetrieveResponse = License

@TSNamespace("compute.licenses")
@UCloudApiExperimental(ExperimentalLevel.ALPHA)
object Licenses : CallDescriptionContainer("licenses") {
    const val baseContext = "/api/licenses"

    init {
        title = "Compute: Licenses"
        description = """
            TODO
        """
    }

    val browse = call<LicensesBrowseRequest, LicensesBrowseResponse, CommonErrorMessage>("browse") {
        httpBrowse(baseContext)
    }

    val create = call<LicensesCreateRequest, LicensesCreateResponse, CommonErrorMessage>("create") {
        httpCreate(baseContext)
    }

    val delete = call<LicensesDeleteRequest, LicensesDeleteResponse, CommonErrorMessage>("delete") {
        httpDelete(baseContext)
    }

    val retrieve = call<LicensesRetrieveRequest, LicensesRetrieveResponse, CommonErrorMessage>("retrieve") {
        httpRetrieve(baseContext)
    }
}
