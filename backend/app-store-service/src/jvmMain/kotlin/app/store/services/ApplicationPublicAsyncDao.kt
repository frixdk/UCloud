package dk.sdu.cloud.app.store.services

import dk.sdu.cloud.Roles
import dk.sdu.cloud.SecurityPrincipal
import dk.sdu.cloud.service.db.async.DBContext
import dk.sdu.cloud.service.db.async.getField
import dk.sdu.cloud.service.db.async.sendPreparedStatement
import dk.sdu.cloud.service.db.async.withSession

class ApplicationPublicAsyncDao() {
    suspend fun isPublic(
        ctx: DBContext,
        user: SecurityPrincipal,
        appName: String,
        appVersion: String
    ): Boolean {
        val result = ctx.withSession { session ->
            session
                .sendPreparedStatement(
                    {
                        setParameter("name", appName.toLowerCase())
                        setParameter("version", appVersion.toLowerCase())
                    },
                    """
                        SELECT *
                        FROM applications
                        WHERE (name = ?name) AND (version = ?version)
                    """.trimIndent()
                )
                .rows
                .singleOrNull() ?: throw ApplicationException.NotFound()

        }
        return result.getField(ApplicationTable.isPublic)
    }

    suspend fun setPublic(
        ctx: DBContext,
        user: SecurityPrincipal,
        appName: String,
        appVersion: String,
        public: Boolean
    ) {
        val normalizedAppName = appName.toLowerCase()
        val normalizedAppVersion = appVersion.toLowerCase()
        if (user.role !in Roles.PRIVILEGED) throw ApplicationException.NotAllowed()
        val existing = ctx.withSession { session ->
            internalByNameAndVersion(session, normalizedAppName, normalizedAppVersion) ?: throw ApplicationException.NotFound()
        }
        if (!canUserPerformWriteOperation(existing.getField(ApplicationTable.owner), user)) throw ApplicationException.NotAllowed()

        ctx.withSession { session ->
            session
                .sendPreparedStatement(
                    {
                        setParameter("public", public)
                        setParameter("name", normalizedAppName)
                        setParameter("version", normalizedAppVersion)
                    },
                    """
                        UPDATE applications
                        SET is_public = ?public
                        WHERE (name = ?name) AND (version = ?version)
                    """.trimIndent()
              )
        }

    }
}
