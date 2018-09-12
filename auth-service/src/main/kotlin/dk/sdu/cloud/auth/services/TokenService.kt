package dk.sdu.cloud.auth.services

import com.auth0.jwt.JWT
import com.auth0.jwt.JWTCreator
import dk.sdu.cloud.SecurityPrincipalToken
import dk.sdu.cloud.SecurityScope
import dk.sdu.cloud.auth.api.*
import dk.sdu.cloud.auth.http.CoreAuthController.Companion.MAX_EXTENSION_TIME_IN_MS
import dk.sdu.cloud.auth.services.saml.AttributeURIs
import dk.sdu.cloud.auth.services.saml.SamlRequestProcessor
import dk.sdu.cloud.service.RPCException
import dk.sdu.cloud.service.TokenValidation
import dk.sdu.cloud.service.db.DBSessionFactory
import dk.sdu.cloud.service.db.withTransaction
import dk.sdu.cloud.service.stackTraceToString
import dk.sdu.cloud.service.toSecurityToken
import io.ktor.http.HttpStatusCode
import org.slf4j.LoggerFactory
import java.security.SecureRandom
import java.util.*

internal typealias JWTAlgorithm = com.auth0.jwt.algorithms.Algorithm

class JWTFactory(private val jwtAlg: JWTAlgorithm) {
    fun create(
        user: Principal,
        expiresIn: Long,
        audience: List<SecurityScope>,
        extendedBy: String? = null,
        jwtId: String? = null,
        sessionReference: String? = null
    ): AccessToken {
        val now = System.currentTimeMillis()
        val iat = Date(now)
        val exp = Date(now + expiresIn)

        val token = JWT.create().run {
            writeStandardClaims(user)
            withExpiresAt(exp)
            withIssuedAt(iat)

            // Legacy code. Progress tracked in #286 (this can be removed when issue has been solved)
            val legacyAudiences = run {
                val result = ArrayList<String>()

                val hasDownload = audience.any { it.toString() == "files.download:write" }
                if (hasDownload) result.add("downloadFile")

                result.add("irods")
                result
            }

            withAudience(*(audience.map { it.toString() } + legacyAudiences).toTypedArray())
            if (extendedBy != null) withClaim(CLAIM_EXTENDED_BY, extendedBy)
            if (jwtId != null) withJWTId(jwtId)
            if (sessionReference != null) withClaim(CLAIM_SESSION_REFERENCE, sessionReference)
            sign(jwtAlg)
        }

        return AccessToken(token)
    }

    private fun JWTCreator.Builder.writeStandardClaims(user: Principal) {
        withSubject(user.id)
        withClaim("role", user.role.name)

        withIssuer("cloud.sdu.dk")

        when (user) {
            is Person -> {
                withClaim("firstNames", user.firstNames)
                withClaim("lastName", user.lastName)
                if (user.orcId != null) withClaim("orcId", user.orcId)
                if (user.title != null) withClaim("title", user.title)
            }
        }

        // TODO This doesn't seem right
        val type = when (user) {
            is Person.ByWAYF -> "wayf"
            is Person.ByPassword -> "password"
            is ServicePrincipal -> "service"
        }
        withClaim("principalType", type)
    }

    companion object {
        const val CLAIM_EXTENDED_BY = "extendedBy"
        const val CLAIM_SESSION_REFERENCE = "publicSessionReference"
    }
}

class TokenService<DBSession>(
    private val db: DBSessionFactory<DBSession>,
    private val userDao: UserDAO<DBSession>,
    private val refreshTokenDao: RefreshTokenDAO<DBSession>,
    private val jwtFactory: JWTFactory,
    private val userCreationService: UserCreationService<*>,
    private val allowedServiceExtensionScopes: Map<String, Set<SecurityScope>> = emptyMap()
) {
    private val log = LoggerFactory.getLogger(TokenService::class.java)

    private val secureRandom = SecureRandom()
    private fun generateCsrfToken(): String {
        val array = ByteArray(64)
        secureRandom.nextBytes(array)
        return Base64.getEncoder().encodeToString(array)
    }

    private fun createAccessTokenForExistingSession(
        user: Principal,
        sessionReference: String?,
        expiresIn: Long = 1000 * 60 * 10
    ): AccessToken {
        return jwtFactory.create(user, expiresIn, listOf(SecurityScope.ALL_WRITE), sessionReference = sessionReference)
    }

    private fun createOneTimeAccessTokenForExistingSession(
        user: Principal,
        audience: List<SecurityScope>
    ): OneTimeAccessToken {
        val jti = UUID.randomUUID().toString()
        return OneTimeAccessToken(
            jwtFactory.create(
                user = user,
                audience = audience,
                expiresIn = 30 * 1000,
                jwtId = jti
            ).accessToken,
            jti
        )
    }

    private fun createExtensionToken(
        user: Principal,
        expiresIn: Long,
        scopes: List<SecurityScope>,
        requestedBy: String
    ): AccessToken {
        return jwtFactory.create(user, expiresIn, scopes, extendedBy = requestedBy)
    }

    fun createAndRegisterTokenFor(
        user: Principal,
        expiresIn: Long = 1000 * 60 * 10
    ): AuthenticationTokens {
        log.debug("Creating and registering token for $user")
        val refreshToken = UUID.randomUUID().toString()
        val csrf = generateCsrfToken()

        val tokenAndUser = RefreshTokenAndUser(user.id, refreshToken, csrf)
        db.withTransaction {
            log.debug(tokenAndUser.toString())
            refreshTokenDao.insert(it, tokenAndUser)
        }

        val accessToken = createAccessTokenForExistingSession(
            user,
            tokenAndUser.publicSessionReference,
            expiresIn
        ).accessToken

        return AuthenticationTokens(accessToken, refreshToken, csrf)
    }

    fun extendToken(
        token: SecurityPrincipalToken,
        expiresIn: Long,
        rawSecurityScopes: List<String>,
        requestedBy: String
    ): AccessToken {
        val requestedScopes = rawSecurityScopes.map {
            try {
                SecurityScope.parseFromString(it)
            } catch (ex: IllegalArgumentException) {
                throw ExtensionException.BadRequest("Bad scope: $it")
            }
        }

        // Request and scope validation
        val extensions = allowedServiceExtensionScopes[requestedBy] ?: emptySet()
        if (!requestedScopes.all { it in extensions }) {
            throw ExtensionException.Unauthorized(
                "Service $requestedBy is not allowed to ask for one " +
                        "of the requested permissions"
            )

        }

        // We must ensure that the token we receive has enough permissions.
        // This is needed since we would otherwise have privilege escalation here
        val allRequestedScopesAreCoveredByUserScopes = requestedScopes.all { requestedScope ->
            token.scopes.any { userScope ->
                requestedScope.isCoveredBy(userScope)
            }
        }

        if (!allRequestedScopesAreCoveredByUserScopes) {
            throw ExtensionException.Unauthorized("Cannot extend due to missing user scopes")
        }

        if (expiresIn < 0 || expiresIn > MAX_EXTENSION_TIME_IN_MS) {
            throw ExtensionException.BadRequest("Bad request (expiresIn)")
        }

        // Require, additionally, that no all or special scopes are requested
        val noSpecialScopes = requestedScopes.all {
            it.segments.first() != SecurityScope.ALL_SCOPE &&
                    it.segments.first() != SecurityScope.SPECIAL_SCOPE
        }

        if (!noSpecialScopes) {
            throw ExtensionException.Unauthorized("Cannot request special scopes")
        }

        // Find user
        val user = db.withTransaction {
            userDao.findByIdOrNull(it, token.principal.username)
        } ?: throw ExtensionException.InternalError("Could not find user in database")

        return createExtensionToken(user, expiresIn, requestedScopes, requestedBy)
    }

    fun processSAMLAuthentication(samlRequestProcessor: SamlRequestProcessor): Person.ByWAYF? {
        try {
            log.debug("Processing SAML response")
            if (samlRequestProcessor.authenticated) {
                val id =
                    samlRequestProcessor.attributes[AttributeURIs.EduPersonTargetedId]?.firstOrNull()
                            ?: throw IllegalArgumentException(
                                "Missing EduPersonTargetedId"
                            )

                log.debug("User is authenticated with id $id")

                return try {
                    db.withTransaction { userDao.findById(it, id) } as Person.ByWAYF
                } catch (ex: UserException.NotFound) {
                    log.debug("User not found. Creating new user...")

                    val userCreated = PersonUtils.createUserByWAYF(samlRequestProcessor)
                    userCreationService.blockingCreateUser(userCreated)
                    userCreated
                }
            }
        } catch (ex: Exception) {
            when (ex) {
                is IllegalArgumentException -> {
                    log.info("Illegal incoming SAML message")
                    log.debug(ex.stackTraceToString())
                }
                else -> {
                    log.warn("Caught unexpected exception while processing SAML response:")
                    log.warn(ex.stackTraceToString())
                }
            }
        }

        return null
    }

    fun requestOneTimeToken(jwt: String, audience: List<SecurityScope>): OneTimeAccessToken {
        log.debug("Requesting one-time token: audience=$audience jwt=$jwt")

        val validated = TokenValidation.validateOrNull(jwt) ?: throw RefreshTokenException.InvalidToken()
        val user = db.withTransaction {
            userDao.findByIdOrNull(it, validated.subject) ?: throw RefreshTokenException.InternalError()
        }

        val currentScopes = validated.toSecurityToken().scopes
        val allScopesCovered = audience.all { requestedScope ->
            currentScopes.any { requestedScope.isCoveredBy(it) }
        }

        if (!allScopesCovered) throw RefreshTokenException.InvalidToken()

        return createOneTimeAccessTokenForExistingSession(user, audience)
    }

    fun refresh(rawToken: String, csrfToken: String? = null): AccessTokenAndCsrf {
        return db.withTransaction { session ->
            log.debug("Refreshing token: rawToken=$rawToken")
            val token = refreshTokenDao.findById(session, rawToken) ?: run {
                log.debug("Could not find token!")
                throw RefreshTokenException.InvalidToken()
            }

            if (csrfToken != null && csrfToken != token.csrf) {
                log.info("Invalid CSRF token")
                log.debug("Received token: $csrfToken, but I expected ${token.csrf}")
                throw RefreshTokenException.InvalidToken()
            }

            val user = userDao.findByIdOrNull(session, token.associatedUser) ?: run {
                log.warn(
                    "Received a valid token, but was unable to resolve the associated user: " +
                            token.associatedUser
                )
                throw RefreshTokenException.InternalError()
            }

            val newCsrf = generateCsrfToken()
            refreshTokenDao.updateCsrf(session, rawToken, newCsrf)
            val accessToken = createAccessTokenForExistingSession(user, token.publicSessionReference)
            AccessTokenAndCsrf(accessToken.accessToken, newCsrf)
        }
    }

    fun logout(refreshToken: String, csrfToken: String? = null) {
        db.withTransaction {
            if (csrfToken == null) {
                if (!refreshTokenDao.delete(it, refreshToken)) throw RefreshTokenException.InvalidToken()
            } else {
                val userAndToken =
                    refreshTokenDao.findById(it, refreshToken) ?: throw RefreshTokenException.InvalidToken()
                if (csrfToken != userAndToken.csrf) throw RefreshTokenException.InvalidToken()
                if (!refreshTokenDao.delete(it, refreshToken)) throw RefreshTokenException.InvalidToken()
            }
        }
    }

    sealed class ExtensionException(why: String, httpStatusCode: HttpStatusCode) : RPCException(why, httpStatusCode) {
        class BadRequest(why: String) : ExtensionException(why, HttpStatusCode.BadRequest)
        class Unauthorized(why: String) : ExtensionException(why, HttpStatusCode.Unauthorized)
        class InternalError(why: String) : ExtensionException(why, HttpStatusCode.InternalServerError)
    }

    sealed class RefreshTokenException(why: String, httpStatusCode: HttpStatusCode) :
        RPCException(why, httpStatusCode) {
        class InvalidToken : RefreshTokenException("Invalid token", HttpStatusCode.Unauthorized)
        class InternalError : RefreshTokenException("Internal server error", HttpStatusCode.InternalServerError)
    }

}