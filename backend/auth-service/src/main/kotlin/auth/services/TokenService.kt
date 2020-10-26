package dk.sdu.cloud.auth.services

import com.auth0.jwt.interfaces.DecodedJWT
import dk.sdu.cloud.Role
import dk.sdu.cloud.SecurityPrincipalToken
import dk.sdu.cloud.SecurityScope
import dk.sdu.cloud.auth.api.AccessTokenAndCsrf
import dk.sdu.cloud.auth.api.AuthenticationTokens
import dk.sdu.cloud.auth.api.OneTimeAccessToken
import dk.sdu.cloud.auth.api.OptionalAuthenticationTokens
import dk.sdu.cloud.auth.api.Person
import dk.sdu.cloud.auth.api.Principal
import dk.sdu.cloud.auth.api.RefreshTokenAndCsrf
import dk.sdu.cloud.auth.http.CoreAuthController.Companion.MAX_EXTENSION_TIME_IN_MS
import dk.sdu.cloud.auth.services.saml.SamlRequestProcessor
import dk.sdu.cloud.calls.server.toSecurityToken
import dk.sdu.cloud.service.Loggable
import dk.sdu.cloud.service.Time
import dk.sdu.cloud.service.TokenValidation
import dk.sdu.cloud.service.db.DBSessionFactory
import dk.sdu.cloud.service.db.async.DBContext
import dk.sdu.cloud.service.db.async.withSession
import dk.sdu.cloud.service.db.withTransaction
import kotlinx.coroutines.delay
import java.security.SecureRandom
import java.util.*

class TokenService(
    private val db: DBContext,
    private val personService: PersonService,
    private val userDao: UserAsyncDAO,
    private val refreshTokenDao: RefreshTokenAsyncDAO,
    private val jwtFactory: JWTFactory,
    private val userCreationService: UserCreationService,
    private val tokenValidation: TokenValidation<DecodedJWT>,
    private val allowedServiceExtensionScopes: Map<String, Set<SecurityScope>> = emptyMap(),
    private val devMode: Boolean = false
) {
    private val secureRandom = SecureRandom()

    // JWT validation fails if we are using a mocked time source (since it is not using our mock)
    // As a result we always use a real time source
    private fun now(): Long = System.currentTimeMillis()

    private fun createOneTimeAccessTokenForExistingSession(
        user: Principal,
        audience: List<SecurityScope>
    ): OneTimeAccessToken {
        val jti = UUID.randomUUID().toString()
        val token = AccessTokenContents(
            user = user,
            scopes = audience,
            createdAt = now(),
            expiresAt = now() + THIRTY_SECONDS_IN_MILLS,
            claimableId = jti
        )

        return OneTimeAccessToken(jwtFactory.generate(token), jti)
    }

    /**
     * Creates and registers a set of [AuthenticationTokens] for a [user].
     *
     * The [tokenTemplate] is used for tokens generated by the [AuthenticationTokens.refreshToken]. Note that
     * fields in [tokenTemplate] related to a concrete token are ignored. This list includes:
     *
     * - [AccessTokenContents.sessionReference]
     * - [AccessTokenContents.claimableId]
     */
    suspend fun createAndRegisterTokenFor(
        user: Principal,
        tokenTemplate: AccessTokenContents = AccessTokenContents(
            user,
            listOf(SecurityScope.ALL_WRITE),
            now(),
            now() + TEN_MIN_IN_MILLS
        ),
        refreshTokenExpiry: Long? = null,
        userAgent: String? = null,
        ip: String? = null
    ): AuthenticationTokens {
        fun generateCsrfToken(): String {
            val array = ByteArray(CSRF_TOKEN_SIZE)
            secureRandom.nextBytes(array)
            return Base64.getEncoder().encodeToString(array)
        }

        log.debug("Creating and registering token for $user")
        val refreshToken = UUID.randomUUID().toString()
        val csrf = generateCsrfToken()

        val expiresAfter = tokenTemplate.expiresAt - tokenTemplate.createdAt
        val tokenAndUser = RefreshTokenAndUser(
            user.id,
            refreshToken,
            csrf,
            expiresAfter = expiresAfter,
            scopes = tokenTemplate.scopes,
            extendedBy = tokenTemplate.extendedBy,
            extendedByChain = tokenTemplate.extendedByChain,
            refreshTokenExpiry = refreshTokenExpiry,
            ip = ip,
            userAgent = userAgent,
            createdAt = tokenTemplate.createdAt
        )

        log.debug(tokenAndUser.toString())
        refreshTokenDao.insert(db, tokenAndUser)

        val (accessToken, newCsrf) = refresh(user, tokenAndUser)
        return AuthenticationTokens(accessToken, refreshToken, newCsrf)
    }

    suspend fun extendToken(
        token: SecurityPrincipalToken,
        expiresIn: Long,
        rawSecurityScopes: List<String>,
        requestedBy: String,
        allowRefreshes: Boolean
    ): OptionalAuthenticationTokens {
        log.debug("Validating token extension request")
        if (expiresIn < 0 || expiresIn > MAX_EXTENSION_TIME_IN_MS) {
            throw ExtensionException.BadRequest("Bad request (expiresIn)")
        }

        log.debug("Parsing requested scopes")
        val requestedScopes = rawSecurityScopes.map {
            try {
                SecurityScope.parseFromString(it)
            } catch (ex: IllegalArgumentException) {
                log.debug(ex.stackTraceToString())
                throw ExtensionException.BadRequest("Bad scope: $it")
            }
        }

        // Request and scope validation
        if (!devMode) {
            log.debug("Checking extension allowed by service")
            val extensions = allowedServiceExtensionScopes[requestedBy] ?: emptySet()
            log.debug("Allowed extensions: $extensions")
            val allRequestedScopesAreCoveredByPolicy = requestedScopes.all { requestedScope ->
                extensions.any { userScope ->
                    requestedScope.isCoveredBy(userScope)
                }
            }
            if (!allRequestedScopesAreCoveredByPolicy) {
                throw ExtensionException.Unauthorized(
                    "Service $requestedBy is not allowed to ask for one " +
                        "of the requested permissions. We were asked for: $requestedScopes, " +
                        "but service is only allowed to $extensions"
                )
            }

            // Require, additionally, that no all or special scopes are requested
            log.debug("Checking for special scopes")
            val noSpecialScopes = requestedScopes.all {
                it.segments.first() != SecurityScope.ALL_SCOPE &&
                    it.segments.first() != SecurityScope.SPECIAL_SCOPE
            }

            if (!noSpecialScopes) {
                throw ExtensionException.Unauthorized("Cannot request special scopes")
            }
        }

        // We must ensure that the token we receive has enough permissions.
        // This is needed since we would otherwise have privilege escalation here
        log.debug("Checking if all requested scopes are covered by our user scopes")
        val allRequestedScopesAreCoveredByUserScopes = requestedScopes.all { requestedScope ->
            token.scopes.any { userScope ->
                requestedScope.isCoveredBy(userScope)
            }
        }

        if (!allRequestedScopesAreCoveredByUserScopes) {
            throw ExtensionException.Unauthorized("Cannot extend due to missing user scopes")
        }

        // Find user
        log.debug("Looking up user")
        val user = userDao.findByIdOrNull(db, token.principal.username)
            ?: throw ExtensionException.InternalError("Could not find user in database (${token.principal.username}")

        val tokenTemplate = AccessTokenContents(
            user = user,
            scopes = requestedScopes,
            createdAt = now(),
            expiresAt = now() + expiresIn,
            extendedBy = requestedBy,
            extendedByChain = token.extendedByChain + listOf(requestedBy)
        )

        return if (allowRefreshes) {
            log.debug("Creating token (with refreshes)")
            val result = createAndRegisterTokenFor(
                user,
                tokenTemplate,
                ip = null,
                userAgent = null
            )

            OptionalAuthenticationTokens(result.accessToken, result.csrfToken, result.refreshToken)
        } else {
            log.debug(("Creating token (without refreshes)"))
            OptionalAuthenticationTokens(jwtFactory.generate(tokenTemplate), null, null)
        }
    }

    suspend fun requestOneTimeToken(jwt: String, audience: List<SecurityScope>): OneTimeAccessToken {
        log.debug("Requesting one-time token: audience=$audience jwt=$jwt")

        val validated = tokenValidation.validateOrNull(jwt) ?: throw RefreshTokenException.InvalidToken()
        val user = userDao.findByIdOrNull(db, validated.subject) ?: throw RefreshTokenException.InternalError()

        val currentScopes = validated.toSecurityToken().scopes
        val allScopesCovered = audience.all { requestedScope ->
            currentScopes.any { requestedScope.isCoveredBy(it) }
        }

        if (!allScopesCovered) {
            log.debug("We were asked to cover $audience, but the token only covers $currentScopes")
            throw RefreshTokenException.InvalidToken()
        }

        return createOneTimeAccessTokenForExistingSession(user, audience)
    }

    private fun refresh(
        user: Principal,
        token: RefreshTokenAndUser,
        csrfToken: String? = null
    ): AccessTokenAndCsrf {
        if (csrfToken != null && csrfToken != token.csrf) {
            log.info("Invalid CSRF token")
            log.debug("Received token: '$csrfToken', but I expected '${token.csrf}'")
            throw RefreshTokenException.InvalidToken()
        }

        val accessToken = jwtFactory.generate(
            AccessTokenContents(
                user,
                token.scopes,
                now(),
                now() + token.expiresAfter,
                claimableId = null,
                sessionReference = token.publicSessionReference,
                extendedBy = token.extendedBy,
                extendedByChain = token.extendedByChain
            )
        )
        return AccessTokenAndCsrf(accessToken, token.csrf)
    }

    suspend fun refresh(rawToken: String, csrfToken: String? = null): AccessTokenAndCsrf {
        log.debug("Refreshing token: rawToken='$rawToken'")
        return db.withSession { session ->
            val token = refreshTokenDao.findById(session, rawToken) ?: run {
                log.debug("Could not find token!")
                throw RefreshTokenException.InvalidToken()
            }

            val user = userDao.findByIdOrNull(session, token.associatedUser) ?: run {
                log.warn(
                    "Received a valid token, but was unable to resolve the associated user: " +
                        token.associatedUser
                )
                throw RefreshTokenException.InternalError()
            }
            refresh(user, token, csrfToken)
        }
    }

    suspend fun logout(refreshToken: String, csrfToken: String? = null) {
        bulkLogout(listOf(RefreshTokenAndCsrf(refreshToken, csrfToken)), suppressExceptions = false)
    }

    suspend fun bulkLogout(tokens: List<RefreshTokenAndCsrf>, suppressExceptions: Boolean = false) {
        db.withSession { session ->
            tokens.forEach { (refreshToken, csrfToken) ->
                if (csrfToken == null) {
                    if (!refreshTokenDao.delete(session, refreshToken)) {
                        if (!suppressExceptions) throw RefreshTokenException.InvalidToken()
                    }
                } else {
                    val userAndToken = refreshTokenDao.findById(session, refreshToken) ?: run {
                        if (!suppressExceptions) throw RefreshTokenException.InvalidToken()
                        else return@forEach
                    }

                    if (csrfToken != userAndToken.csrf) {
                        if (!suppressExceptions) throw RefreshTokenException.InvalidToken()
                        else return@forEach
                    }
                    if (!refreshTokenDao.delete(session, refreshToken)) {
                        if (!suppressExceptions) throw RefreshTokenException.InvalidToken()
                    }
                }
            }
        }
    }

    suspend fun processSAMLAuthentication(samlRequestProcessor: SamlRequestProcessor): Person.ByWAYF? {
        try {
            log.debug("Processing SAML response")
            if (samlRequestProcessor.authenticated) {
                val id =
                    samlRequestProcessor.attributes["eduPersonTargetedID"]?.firstOrNull()
                        ?: throw IllegalArgumentException("Missing EduPersonTargetedId")

                val email = samlRequestProcessor.attributes["mail"]?.firstOrNull()

                log.debug("User is authenticated with id $id")

                try {
                    return userDao.findByWayfIdAndUpdateEmail(db, id, email)
                } catch (ex: UserException.NotFound) {
                    log.debug("User not found. Creating new user...")

                    loop@ for (i in 0..5) {
                        try {
                            // Expand this call to accept the username. We need the UserDAO to find a valid ID.
                            // Alternatively, we can make PersonService a proper service (better choice?)
                            val userCreated = personService.createUserByWAYF(samlRequestProcessor)
                            userCreationService.createUser(userCreated)
                            return userDao.findByWayfId(db, id)
                        } catch (ex: Exception) {
                            if (i < 5) log.debug(ex.stackTraceToString())
                            else log.warn(ex.stackTraceToString())

                            delay(50)
                        }
                    }
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

    companion object : Loggable {
        private const val TEN_MIN_IN_MILLS = 1000 * 60 * 10L
        private const val THIRTY_SECONDS_IN_MILLS = 1000 * 60L
        private const val CSRF_TOKEN_SIZE = 64

        override val log = logger()
    }
}
