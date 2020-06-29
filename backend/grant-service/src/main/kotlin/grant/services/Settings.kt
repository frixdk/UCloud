package dk.sdu.cloud.grant.services

import com.github.jasync.sql.db.RowData
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.grant.api.AutomaticApprovalSettings
import dk.sdu.cloud.grant.api.ProjectApplicationSettings
import dk.sdu.cloud.grant.api.ResourceRequest
import dk.sdu.cloud.grant.api.UserCriteria
import dk.sdu.cloud.service.Actor
import dk.sdu.cloud.service.db.async.*
import io.ktor.http.HttpStatusCode

object AllowApplicationsFromTable : SQLTable("allow_applications_from") {
    val projectId = text("project_id", notNull = true)
    val type = text("type", notNull = true)
    val applicantId = text("applicant_id", notNull = false)
}

object AutomaticApprovalUsersTable : SQLTable("automatic_approval_users") {
    val projectId = text("project_id", notNull = true)
    val type = text("type", notNull = true)
    val applicantId = text("applicant_id", notNull = false)
}

object AutomaticApprovalLimitsTable : SQLTable("automatic_approval_limits") {
    val projectId = text("project_id", notNull = true)
    val productCategory = text("product_category", notNull = true)
    val productProvider = text("product_provider", notNull = true)
    val maximumCredits = long("maximum_credits", notNull = false)
    val maximumQuota = long("maximum_quota_bytes", notNull = false)
}

class SettingsService(
    private val projects: ProjectCache
) {
    suspend fun updateApplicationsFromList(
        ctx: DBContext,
        actor: Actor,
        projectId: String,
        applicantWhitelist: List<UserCriteria>
    ) {
        if (!projects.isAdminOfProject(projectId, actor)) throw RPCException.fromStatusCode(HttpStatusCode.NotFound)

        ctx.withSession { session ->
            session
                .sendPreparedStatement(
                    { setParameter("projectId", projectId) },
                    "delete from allow_applications_from where project_id = :projectId"
                )

            applicantWhitelist.forEach { applicant ->
                session
                    .sendPreparedStatement(
                        {
                            setParameter("projectId", projectId)
                            setParameter("type", applicant.toSqlType())
                            setParameter("applicantId", applicant.toSqlApplicantId())
                        },
                        "insert into allow_applications_from (project_id, type, applicant_id) values (:projectId, :type, :applicantId)"
                    )
            }
        }
    }

    suspend fun updateAutomaticApprovalList(
        ctx: DBContext,
        actor: Actor,
        projectId: String,
        settings: AutomaticApprovalSettings
    ) {
        if (!projects.isAdminOfProject(projectId, actor)) throw RPCException.fromStatusCode(HttpStatusCode.NotFound)

        ctx.withSession { session ->
            session
                .sendPreparedStatement(
                    { setParameter("projectId", projectId) },
                    "delete from automatic_approval_users where project_id = :projectId"
                )
            session
                .sendPreparedStatement(
                    { setParameter("projectId", projectId) },
                    "delete from automatic_approval_limits where project_id = :projectId"
                )

            settings.from.forEach { applicant ->
                session
                    .sendPreparedStatement(
                        {
                            setParameter("projectId", projectId)
                            setParameter("type", applicant.toSqlType())
                            setParameter("applicantId", applicant.toSqlApplicantId())
                        },
                        "insert into automatic_approval_users (project_id, type, applicant_id) values (:projectId, :type, :applicantId)"
                    )
            }

            settings.maxResources.forEach { resources ->
                session
                    .sendPreparedStatement(
                        {
                            setParameter("projectId", projectId)
                            setParameter("productCategory", resources.productCategory)
                            setParameter("productProvider", resources.productProvider)
                            setParameter("maximumCredits", resources.creditsRequested)
                            setParameter("maximumQuota", resources.quotaRequested)
                        },
                        """
                            insert into automatic_approval_limits 
                                (project_id, product_category, product_provider, maximum_credits, maximum_quota_bytes) 
                            values (:projectId, :productCategory, :productProvider, :maximumCredits, :maxQuota)
                        """
                    )
            }
        }
    }

    suspend fun fetchSettings(
        ctx: DBContext,
        projectId: String
    ): ProjectApplicationSettings {
        return ctx.withSession { session ->
            val allowFrom = session
                .sendPreparedStatement(
                    { setParameter("projectId", projectId) },

                    """
                        select * from allow_applications_from
                        where project_id = :projectId
                    """
                )
                .rows.map { it.toUserCriteria() }

            val limits = session
                .sendPreparedStatement(
                    { setParameter("projectId", projectId) },
                    """
                        select * from automatic_approval_limits
                        where project_id = :projectId
                    """
                )
                .rows.map { it.toAutomaticApproval() }

            val automaticApprovalUsers = session
                .sendPreparedStatement(
                    { setParameter("projectId", projectId) },
                    """
                        select * from automatic_approval_users
                        where project_id = :projectId
                    """
                )
                .rows.map { it.toUserCriteria() }

            ProjectApplicationSettings(AutomaticApprovalSettings(automaticApprovalUsers, limits), allowFrom)
        }
    }

    private fun UserCriteria.toSqlApplicantId(): String? {
        return when (this) {
            UserCriteria.Anyone -> null
            is UserCriteria.EmailDomain -> domain
            is UserCriteria.WayfOrganization -> org
        }
    }

    private fun UserCriteria.toSqlType(): String {
        return when (this) {
            UserCriteria.Anyone -> UserCriteria.ANYONE_TYPE
            is UserCriteria.EmailDomain -> UserCriteria.EMAIL_TYPE
            is UserCriteria.WayfOrganization -> UserCriteria.WAYF_TYPE
        }
    }

    private fun RowData.toUserCriteria(): UserCriteria {
        val id = getField(AllowApplicationsFromTable.applicantId)
        return when (getField(AllowApplicationsFromTable.type)) {
            UserCriteria.ANYONE_TYPE -> UserCriteria.Anyone
            UserCriteria.EMAIL_TYPE -> UserCriteria.EmailDomain(id)
            UserCriteria.WAYF_TYPE -> UserCriteria.WayfOrganization(id)
            else -> throw IllegalArgumentException("Unknown type")
        }
    }

    private fun RowData.toAutomaticApproval(): ResourceRequest {
        return ResourceRequest(
            getField(AutomaticApprovalLimitsTable.productCategory),
            getField(AutomaticApprovalLimitsTable.productProvider),
            getFieldNullable(AutomaticApprovalLimitsTable.maximumCredits),
            getFieldNullable(AutomaticApprovalLimitsTable.maximumQuota)
        )
    }
}
