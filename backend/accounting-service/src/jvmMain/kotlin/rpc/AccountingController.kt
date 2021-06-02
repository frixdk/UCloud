package dk.sdu.cloud.accounting.rpc

import dk.sdu.cloud.Actor
import dk.sdu.cloud.accounting.api.*
import dk.sdu.cloud.accounting.services.wallets.BalanceService
import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.calls.server.project
import dk.sdu.cloud.calls.server.securityPrincipal
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.service.actorAndProject
import dk.sdu.cloud.service.db.async.DBContext
import dk.sdu.cloud.service.db.async.withSession
import dk.sdu.cloud.toActor

class AccountingController(
    private val db: DBContext,
    private val balance: BalanceService
) : Controller {
    override fun configure(rpcServer: RpcServer) = with(rpcServer) {
        implement(Wallets.addToBalance) {
            balance.addToBalance(db, ctx.securityPrincipal.toActor(), request.wallet, request.credits)
            ok(Unit)
        }

        implement(Wallets.addToBalanceBulk) {
            db.withSession { session ->
                request.requests.forEach { req ->
                    balance.addToBalance(session, ctx.securityPrincipal.toActor(), req.wallet, req.credits)
                }
            }
            ok(Unit)
        }

        implement(Wallets.reserveCredits) {
            balance.reserveCredits(
                db,
                request.jobInitiatedBy,
                request
            )

            ok(Unit)
        }

        implement(Wallets.reserveCreditsBulk) {
            db.withSession { session ->
                request.reservations.forEach { reservation ->
                    balance.reserveCredits(
                        session,
                        reservation.jobInitiatedBy,
                        reservation
                    )
                }
            }

            ok(Unit)
        }

        implement(Wallets.chargeReservation) {
            balance.chargeFromReservation(
                db,
                request.name,
                request.amount,
                request.productUnits
            )

            ok(Unit)
        }

        implement(Wallets.transferToPersonal) {
            db.withSession { session ->
                request.transfers.forEach { transfer ->
                    balance.transferToPersonal(
                        session,
                        Actor.SystemOnBehalfOfUser(transfer.initiatedBy),
                        transfer
                    )
                }
            }


            ok(Unit)
        }

        implement(Wallets.retrieveBalance) {
            val project = ctx.project
            val accountId = request.id ?: (project ?: ctx.securityPrincipal.username)
            val accountType = request.type ?: if (project != null) WalletOwnerType.PROJECT else WalletOwnerType.USER

            ok(
                RetrieveBalanceResponse(
                    balance.getWalletsForAccount(
                        db,
                        ctx.securityPrincipal.toActor(),
                        accountId,
                        accountType,
                        request.includeChildren ?: false,
                        request.showHidden ?: true
                    )
                )
            )
        }

        implement(Wallets.setBalance) {
            balance.setBalance(
                db,
                ctx.securityPrincipal.toActor(),
                request.wallet,
                request.lastKnownBalance,
                request.newBalance
            )

            ok(Unit)
        }

        implement(Wallets.retrieveWalletsFromProjects) {
            val results = balance.retrieveWalletsForProjects(db, request.projectIds)
            ok(results)
        }

        implement(Wallets.grantProviderCredits) {
            ok(balance.grantProviderCredits(db, actorAndProject, request.provider))
        }

        return@with
    }
}
