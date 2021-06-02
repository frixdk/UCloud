package dk.sdu.cloud.accounting.services.grants

import dk.sdu.cloud.Actor
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.grant.api.ReadTemplatesResponse
import dk.sdu.cloud.grant.api.UploadTemplatesRequest
import dk.sdu.cloud.grant.api.UserCriteria
import dk.sdu.cloud.safeUsername
import dk.sdu.cloud.service.db.async.*
import io.ktor.http.HttpStatusCode

object TemplateTable : SQLTable("grant.templates") {
    val projectId = text("project_id", notNull = true)
    val personalProject = text("personal_project", notNull = false)
    val existingProject = text("existing_project", notNull = false)
    val newProject = text("new_project", notNull = false)
}

class GrantTemplateService(
    private val projects: ProjectCache,
    private val settings: GrantSettingsService,
    private val defaultApplication: String = ""
) {
    suspend fun uploadTemplates(
        ctx: DBContext,
        actor: Actor,
        projectId: String,
        templates: UploadTemplatesRequest
    ) {
        if (!projects.isAdminOfProject(projectId, actor)) throw RPCException.fromStatusCode(HttpStatusCode.NotFound)

        ctx.withSession { session ->
            session
                .sendPreparedStatement(
                    {
                        setParameter("projectId", projectId)
                        setParameter("personalProject", templates.personalProject)
                        setParameter("existingProject", templates.existingProject)
                        setParameter("newProject", templates.newProject)
                    },

                    """
                        insert into "grant".templates (project_id, personal_project, existing_project, new_project) 
                        values (
                                :projectId,
                                :personalProject,
                                :existingProject,
                                :newProject
                            ) 
                        on conflict (project_id) do update set 
                            personal_project = excluded.personal_project,
                            existing_project = excluded.existing_project,
                            new_project = excluded.new_project
                    """
                )
        }
    }

    suspend fun fetchTemplates(
       ctx: DBContext,
       actor: Actor,
       projectId: String
    ): ReadTemplatesResponse {
        val isProjectAdmin = projects.isAdminOfProject(projectId, actor)
        val isAdminOfChildProject = if (!isProjectAdmin) {
            projects.memberStatus.get(actor.safeUsername())
                ?.membership?.any { it.parent == projectId && it.whoami.role.isAdmin() } ?: false
        } else {
            false
        }

        return ctx.withSession { session ->
            if (!isProjectAdmin && !isAdminOfChildProject) {
                if (actor is Actor.User) {
                    val settings = settings.fetchSettings(session, Actor.System, projectId)
                    if (!settings.allowRequestsFrom.any { it.matches(actor.principal) } ||
                        (actor.principal.email != null &&
                        settings.excludeRequestsFrom.any {
                            it as UserCriteria.EmailDomain
                            actor.principal.email!!.endsWith(it.domain)
                        })
                    ) {
                        throw RPCException.fromStatusCode(HttpStatusCode.Forbidden)
                    }
                } else {
                    throw RPCException.fromStatusCode(HttpStatusCode.Forbidden)
                }
            }

            session
                .sendPreparedStatement(
                    { setParameter("projectId", projectId) },
                    "select * from \"grant\".templates where project_id = :projectId limit 1"
                )
                .rows
                .singleOrNull()
                ?.let {
                    ReadTemplatesResponse(
                        it.getFieldNullable(TemplateTable.personalProject) ?: defaultApplication,
                        it.getFieldNullable(TemplateTable.newProject) ?: defaultApplication,
                        it.getFieldNullable(TemplateTable.existingProject) ?: defaultApplication
                    )
                } ?: ReadTemplatesResponse(defaultApplication, defaultApplication, defaultApplication)
        }
    }
}
