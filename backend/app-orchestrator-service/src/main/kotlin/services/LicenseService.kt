package dk.sdu.cloud.app.orchestrator.services

import dk.sdu.cloud.Role
import dk.sdu.cloud.accounting.api.Product
import dk.sdu.cloud.accounting.api.ProductReference
import dk.sdu.cloud.app.orchestrator.api.*
import dk.sdu.cloud.app.store.api.AppParameterValue
import dk.sdu.cloud.calls.BulkRequest
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.calls.bulkRequestOf
import dk.sdu.cloud.calls.client.call
import dk.sdu.cloud.calls.client.orRethrowAs
import dk.sdu.cloud.calls.client.orThrow
import dk.sdu.cloud.service.*
import dk.sdu.cloud.service.db.async.AsyncDBSessionFactory
import dk.sdu.cloud.service.db.async.DBContext
import dk.sdu.cloud.service.db.async.withSession
import io.ktor.http.*
import java.util.*

class LicenseService(
    private val db: AsyncDBSessionFactory,
    private val dao: LicenseDao,
    private val providers: Providers,
    private val projectCache: ProjectCache,
    private val productCache: ProductCache,
    orchestrator: JobOrchestrator,
    private val paymentService: PaymentService,
) {
    init {
        orchestrator.addListener(object : JobListener {
            override suspend fun onVerified(ctx: DBContext, job: Job) {
                val licenses = job.parameters.parameters?.values?.filterIsInstance<AppParameterValue.License>()
                    ?: emptyList()
                if (licenses.isEmpty()) return

                val computeProvider = job.parameters.product.provider
                val jobProject = job.owner.project
                val jobLauncher = job.owner.launchedBy

                ctx.withSession { session ->
                    licenses.forEach { license ->
                        val retrievedLicenses = dao.retrieve(session, LicenseId(license.id), LicenseDataIncludeFlags())
                            ?: throw RPCException("Invalid license: ${license.id}", HttpStatusCode.BadRequest)

                        if (jobProject != retrievedLicenses.owner.project) {
                            throw RPCException("Invalid license: ${license.id}", HttpStatusCode.BadRequest)
                        }

                        if (jobProject == null && jobLauncher != retrievedLicenses.owner.username) {
                            throw RPCException("Invalid license: ${license.id}", HttpStatusCode.BadRequest)
                        }

                        if (retrievedLicenses.product.provider != computeProvider) {
                            throw RPCException(
                                "Cannot use license provided by " +
                                    "${retrievedLicenses.product.provider} in job provided by $computeProvider",
                                HttpStatusCode.BadRequest
                            )
                        }

                        if (retrievedLicenses.status.state != LicenseState.READY) {
                            throw RPCException(
                                "Ingress ${retrievedLicenses.product.id} is not ready",
                                HttpStatusCode.BadRequest
                            )
                        }
                    }
                }
            }
        })
    }

    suspend fun browse(
        actor: Actor,
        project: String?,
        pagination: NormalizedPaginationRequestV2,
        flags: LicenseDataIncludeFlags,
        filters: LicenseFilters,
    ): PageV2<License> {
        if (project != null && projectCache.retrieveRole(actor.safeUsername(), project) == null) {
            throw RPCException("You are not a member of the supplied project", HttpStatusCode.Forbidden)
        }

        return dao.browse(db, actor, project, pagination, flags, filters)
    }

    suspend fun retrieve(
        actor: Actor,
        id: LicenseId,
        flags: LicenseDataIncludeFlags,
    ): License {
        val notFoundMessage = "Permission denied or license does not exist"
        val result = dao.retrieve(db, id, flags) ?: throw RPCException(notFoundMessage, HttpStatusCode.NotFound)

        val (username, project) = result.owner
        if (actor is Actor.User && actor.principal.role == Role.PROVIDER) {
            providers.verifyProvider(result.product.provider, actor)
        } else {
            if (project != null && projectCache.retrieveRole(actor.safeUsername(), project) == null) {
                throw RPCException(notFoundMessage, HttpStatusCode.NotFound)
            }

            if (project == null && username != actor.safeUsername()) {
                throw RPCException(notFoundMessage, HttpStatusCode.NotFound)
            }
        }

        return result
    }

    suspend fun delete(
        actor: Actor,
        deletionRequest: BulkRequest<LicenseId>
    ) {
        val genericErrorMessage = "Not found or permission denied"

        db.withSession { session ->
            val ids = deletionRequest.items.map { it.id }
            val deletedItems = dao.delete(session, ids)
            val byProvider = deletedItems.groupBy { it.product.provider }

            // Verify that the items were found
            if (ids.toSet().size != deletedItems.size) {
                throw RPCException(genericErrorMessage, HttpStatusCode.NotFound)
            }

            // Verify permissions before calling provider
            for (item in deletedItems) {
                val project = item.owner.project
                if (project != null && projectCache.retrieveRole(actor.safeUsername(), project) == null) {
                    throw RPCException(genericErrorMessage, HttpStatusCode.NotFound)
                }

                if (project == null && item.owner.username != actor.safeUsername()) {
                    throw RPCException(genericErrorMessage, HttpStatusCode.NotFound)
                }
            }

            // TODO This could cause problems when a failure happens for a single provider
            // Verification will technically fix it up later, however.

            // All should be good now, time to call the providers
            for ((provider, ingress) in byProvider) {
                val comms = providers.prepareCommunication(provider)
                val api = comms.licenseApi ?: continue // Provider no longer supports ingress. Silently skip.
                api.delete.call(bulkRequestOf(ingress), comms.client)
            }
        }
    }

    suspend fun create(
        actor: Actor,
        project: String?,
        request: BulkRequest<LicenseCreateRequestItem>
    ): List<String> {
        if (project != null && projectCache.retrieveRole(actor.safeUsername(), project) == null) {
            throw RPCException("You are not a member of the supplied project", HttpStatusCode.Forbidden)
        }

        return request.items.groupBy { it.product.provider }.flatMap { (provider, specs) ->
            val comms = providers.prepareCommunication(provider)
            val api = comms.licenseApi
                ?: throw RPCException("License is not supported by this provider: $provider", HttpStatusCode.BadRequest)

            // NOTE(Dan): It is important that this is performed in a single transaction to allow the provider to
            // immediately start calling us back about these resources, even before it has successfully created the
            // resource. This allows the provider to, for example, perform a charge on the resource before it has
            // been marked as 'created'.
            val ingress = db.withSession { session ->
                specs.map { spec ->
                    val product =
                        productCache.find<Product.License>(
                            spec.product.provider,
                            spec.product.id,
                            spec.product.category
                        ) ?: throw RPCException("Invalid product", HttpStatusCode.BadRequest)

                    val id = UUID.randomUUID().toString()
                    val ingress = License(
                        id,
                        spec.product,
                        LicenseOwner(actor.safeUsername(), project),
                        Time.now(),
                        LicenseStatus(LicenseState.PREPARING),
                        LicenseBilling(product.pricePerUnit, 0L),
                        resolvedProduct = product
                    )

                    dao.create(session, ingress)
                    ingress
                }
            }

            api.create.call(bulkRequestOf(ingress), comms.client).orThrow()

            ingress.map { it.id }
        }
    }

    suspend fun update(
        actor: Actor,
        request: LicenseControlUpdateRequest
    ) {
        db.withSession { session ->
            val now = Time.now()
            for ((id, requests) in request.items.groupBy { it.id }) {
                val ingress = dao.retrieve(session, LicenseId(id), LicenseDataIncludeFlags())
                    ?: throw RPCException.fromStatusCode(HttpStatusCode.NotFound)

                providers.verifyProvider(ingress.product.provider, actor)

                requests.forEach { request ->
                    dao.insertUpdate(
                        session,
                        LicenseId(id),
                        LicenseUpdate(
                            now,
                            request.state,
                            request.status,
                        )
                    )
                }
            }
        }
    }

    suspend fun charge(
        actor: Actor,
        request: LicenseControlChargeCreditsRequest
    ): LicenseControlChargeCreditsResponse {
        val insufficient = ArrayList<LicenseId>()
        val duplicates = ArrayList<LicenseId>()

        db.withSession { session ->
            for ((id, requests) in request.items.groupBy { it.id }) {
                val license = dao.retrieve(session, LicenseId(id), LicenseDataIncludeFlags())
                    ?: throw RPCException.fromStatusCode(HttpStatusCode.NotFound)

                providers.verifyProvider(license.product.provider, actor)

                requests.forEach { request ->
                    val chargeResult = paymentService.charge(
                        Payment.OfLicense(license, request.units, request.chargeId)
                    )

                    when (chargeResult) {
                        is PaymentService.ChargeResult.Charged -> {
                            dao.chargeCredits(session, LicenseId(id), chargeResult.amountCharged)
                        }

                        PaymentService.ChargeResult.InsufficientFunds -> {
                            insufficient.add(LicenseId(id))
                        }

                        PaymentService.ChargeResult.Duplicate -> {
                            duplicates.add(LicenseId(id))
                        }
                    }
                }
            }
        }

        return LicenseControlChargeCreditsResponse(insufficient, duplicates)
    }
}
