package dk.sdu.cloud.app.license.rpc

import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.app.license.api.*
import dk.sdu.cloud.app.license.services.AppLicenseService
import dk.sdu.cloud.app.license.services.acl.UserEntity
import dk.sdu.cloud.app.license.services.acl.EntityType
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.calls.server.securityPrincipal
import dk.sdu.cloud.service.Loggable
import io.ktor.http.HttpStatusCode
import org.hibernate.Session

class AppLicenseController(appLicenseService: AppLicenseService<Session>) : Controller {
    private val licenseService = appLicenseService
    override fun configure(rpcServer: RpcServer): Unit = with(rpcServer) {
        implement(AppLicenseDescriptions.permission) {
            val entity = UserEntity(
                ctx.securityPrincipal.username,
                EntityType.USER
            )
            val licenseServer = licenseService.getLicenseServer(request.licenseId, entity)

            if (licenseServer != null) {
                ok(
                    ApplicationLicenseServer(
                        licenseServer.name,
                        licenseServer.version,
                        licenseServer.address,
                        licenseServer.license
                    )
                )
            } else {
                // Could be because no license server was found, or because the user does not have the correct
                // authorization
                error(
                    CommonErrorMessage("No license found"),
                    HttpStatusCode.NotFound
                )
            }
        }

        implement(AppLicenseDescriptions.updateAcl) {
            val entity = UserEntity(
                ctx.securityPrincipal.username,
                EntityType.USER
            )

            licenseService.updateAcl(request, entity)
        }

        implement(AppLicenseDescriptions.save) {
            val entity = UserEntity(
                ctx.securityPrincipal.username,
                EntityType.USER
            )

            licenseService.saveLicenseServer(request, entity)
        }

        return@configure
    }

    companion object : Loggable {
        override val log = logger()
    }
}