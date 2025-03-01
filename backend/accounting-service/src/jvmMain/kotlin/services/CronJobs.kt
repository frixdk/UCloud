package dk.sdu.cloud.accounting.services

import dk.sdu.cloud.accounting.Configuration
import dk.sdu.cloud.accounting.api.ProductArea
import dk.sdu.cloud.accounting.api.ProductCategoryId
import dk.sdu.cloud.accounting.api.Wallet
import dk.sdu.cloud.accounting.api.WalletOwnerType
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.calls.client.AuthenticatedClient
import dk.sdu.cloud.calls.client.call
import dk.sdu.cloud.calls.client.orThrow
import dk.sdu.cloud.mail.api.*
import dk.sdu.cloud.project.api.LookupAdminsBulkRequest
import dk.sdu.cloud.project.api.LookupByIdBulkRequest
import dk.sdu.cloud.project.api.ProjectMembers
import dk.sdu.cloud.project.api.Projects
import dk.sdu.cloud.service.Loggable
import dk.sdu.cloud.service.db.async.DBContext
import dk.sdu.cloud.service.db.async.getField
import dk.sdu.cloud.service.db.async.sendPreparedStatement
import dk.sdu.cloud.service.db.async.withSession
import io.ktor.http.HttpStatusCode
import java.lang.Exception


class CronJobs(
    private val db: DBContext,
    private val serviceClient: AuthenticatedClient,
    private val config: Configuration
) {
    suspend fun notifyLowFundsWallets() {
        db.withSession { session ->
            session
                .sendPreparedStatement(
                    {
                        setParameter("sent", false)
                        setParameter("limit", config.notificationLimit)
                        setParameter("type", WalletOwnerType.PROJECT.toString())
                        setParameter("compute", ProductArea.COMPUTE.name)
                        setParameter("storage", ProductArea.STORAGE.name)
                    },
                    """
                        DECLARE curs NO SCROLL CURSOR WITH HOLD
                        FOR SELECT account_id, account_type, product_category, product_provider 
                        FROM accounting.wallets as w JOIN accounting.products as p ON w.product_category=p.category
                        WHERE low_funds_notifications_send = :sent 
                            AND balance < :limit 
                            AND account_type = :type 
                            AND (area = :compute or area = :storage)
                        GROUP BY account_id, account_type, product_provider, product_category
                    """
                )
            while (true) {
                val rows = session
                    .sendPreparedStatement(
                        //language=sql
                        """
                        FETCH FORWARD 1000 FROM curs
                        """
                    ).rows

                if (rows.isEmpty()) {
                    break
                }

                val projectIDs = rows.map { it.getField(WalletTable.accountId) }.toSet().toList()
                val projects = Projects.lookupByIdBulk.call(
                    LookupByIdBulkRequest(projectIDs),
                    serviceClient
                ).orThrow().associateBy { it.id }

                val adminsAndPI = ProjectMembers.lookupAdminsBulk.call(
                    LookupAdminsBulkRequest(projectIDs),
                    serviceClient
                ).orThrow()
                val wallets = rows.map {
                    Wallet(
                        it.getField(WalletTable.accountId),
                        WalletOwnerType.valueOf(it.getField(WalletTable.accountType)),
                        ProductCategoryId(
                            it.getField(WalletTable.productCategory),
                            it.getField(WalletTable.productProvider)
                        )
                    )
                }

                val sendRequests = mutableListOf<SendRequest>()

                //For each project send a mail for each wallet below limit to each admin
                adminsAndPI.admins.forEach { projectAndAdmins ->
                    val projectWalletsBelowLimit = wallets.filter { it.id == projectAndAdmins.first }
                    projectAndAdmins.second.forEach { admin ->
                        projectWalletsBelowLimit.forEach { wallet ->
                            sendRequests.add(
                                SendRequest(
                                    admin.username,
                                    Mail.LowFundsMail(
                                        wallet.paysFor.id,
                                        wallet.paysFor.provider,
                                        projects[projectAndAdmins.first]?.title ?: throw RPCException.fromStatusCode(
                                            HttpStatusCode.InternalServerError,
                                            "No project found"
                                        )
                                    )
                                )
                            )
                        }
                    }
                }
                try {
                    MailDescriptions.sendBulk.call(
                        SendBulkRequest(sendRequests),
                        serviceClient
                    ).orThrow()
                } catch (ex: Exception) {
                    log.info("Exception caught: ${ex.stackTraceToString()}")
                    log.info("Continuing")
                }

            }

            session
                .sendPreparedStatement(
                    //language=sql
                    """
                        CLOSE curs
                    """
                )
            //set sent status
            session
                .sendPreparedStatement(
                    {
                        setParameter("state", true)
                        setParameter("oldstate", false)
                        setParameter("limit", config.notificationLimit)
                    },
                    """
                        UPDATE wallets
                        SET low_funds_notifications_send = :state
                        WHERE low_funds_notifications_send = :oldstate AND balance < :limit
                    """
                )
        }
    }

    companion object : Loggable {
        override val log = logger()
    }
}
