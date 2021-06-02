package dk.sdu.cloud.accounting.services.projects

import dk.sdu.cloud.SecurityPrincipal
import dk.sdu.cloud.service.db.async.*

object FavoriteProjectTable : SQLTable("project.project_favorite") {
    val username = text("username")
    val project = text("project_id")
}

class FavoriteProjectService {
    suspend fun toggleFavorite(ctx: DBContext, user: SecurityPrincipal, projectId: String) {
        ctx.withSession { session ->
            if (isFavorite(session, user.username, projectId)) {
                session.sendPreparedStatement(
                    {
                        setParameter("username", user.username)
                        setParameter("projectID", projectId)
                    },
                    """
                        delete from project.project_favorite
                        where 
                            username = :username and 
                            project_id = :projectID
                    """
                )
            } else {
                session.insert(FavoriteProjectTable) {
                    set(FavoriteProjectTable.project, projectId)
                    set(FavoriteProjectTable.username, user.username)
                }
            }
        }
    }

    private suspend fun isFavorite(ctx: DBContext, username: String, projectID: String): Boolean {
        return ctx.withSession { session ->
            session
                .sendPreparedStatement(
                    {
                        setParameter("username", username)
                        setParameter("projectID", projectID)
                    },
                    "select project.is_favorite(:username, :projectID)"
                )
                .rows
                .map { it.getBoolean(0)!! }
                .single()
        }
    }
}


