package dk.sdu.cloud.service

import com.auth0.jwt.interfaces.Claim
import com.auth0.jwt.interfaces.DecodedJWT
import dk.sdu.cloud.Role
import dk.sdu.cloud.SecurityPrincipal
import dk.sdu.cloud.SecurityPrincipalToken
import dk.sdu.cloud.SecurityScope
import dk.sdu.cloud.calls.RPCException
import io.ktor.http.*
import org.slf4j.LoggerFactory

sealed class JWTException(why: String, httpStatusCode: HttpStatusCode) : RPCException(why, httpStatusCode) {
    class InternalError(why: String) : JWTException(why, HttpStatusCode.InternalServerError)
    class MissingScope : JWTException("Missing scope", HttpStatusCode.Unauthorized)
}

private fun <T> DecodedJWT.optionalClaim(
    name: String,
    mapper: (Claim) -> T
): T? {
    return runCatching { requiredClaim(name, mapper) }.getOrNull()
}

private fun <T> DecodedJWT.requiredClaim(
    name: String,
    mapper: (Claim) -> T
): T {
    val claim = getClaim(name) ?: throw JWTException.InternalError("Could not find claim '$name'")

    @Suppress("TooGenericExceptionCaught")
    return try {
        mapper(claim)!!
    } catch (ex: Exception) {
        throw JWTException.InternalError("Could not transform claim '$name'")
    }
}

fun DecodedJWT.toSecurityToken(): SecurityPrincipalToken {
    val validatedToken = this
    val role = validatedToken.optionalClaim("role") { Role.valueOf(it.asString()) } ?: Role.UNKNOWN
    val firstNames = validatedToken.optionalClaim("firstNames") { it.asString() } ?: subject
    val lastName = validatedToken.optionalClaim("lastName") { it.asString() } ?: subject
    val twoFactorAuthentication = validatedToken.optionalClaim("twoFactorAuthentication") { it.asBoolean() } ?: true

    val publicSessionReference = validatedToken
        .getClaim("publicSessionReference")
        .takeIf { !it.isNull }
        ?.asString()

    val extendedBy = validatedToken
        .getClaim("extendedBy")
        .takeIf { !it.isNull }
        ?.asString()

    val email = validatedToken.optionalClaim("email") { it.asString() }
    val principalType = validatedToken.optionalClaim("principalType") { it.asString() }
    val serviceAgreementAccepted = validatedToken.optionalClaim("serviceLicenseAgreement") { it.asBoolean() } ?: true
    val orgId = validatedToken.optionalClaim("orgId") { it.asString() }

    val principal = SecurityPrincipal(
        validatedToken.subject,
        role,
        firstNames,
        lastName,
        validatedToken.getClaim("uid").asLong(),
        email,
        twoFactorAuthentication,
        principalType,
        serviceAgreementAccepted,
        orgId
    )

    val issuedAt = validatedToken.issuedAt.time
    val expiresAt = validatedToken.expiresAt.time

    @Suppress("TooGenericExceptionCaught")
    val scopes =
        validatedToken.audience.mapNotNull {
            try {
                SecurityScope.parseFromString(it)
            } catch (ex: Exception) {
                authCheckLog.info(ex.stackTraceToString())
                null
            }
        }

    val extendedByChain = validatedToken
        .getClaim("extendedByChain")
        .takeIf { !it.isNull }
        ?.asList(String::class.java) ?: emptyList()

    val backwardsCompatibleChain =
        if (extendedByChain.isEmpty() && extendedBy != null) listOf(extendedBy) else extendedByChain

    return SecurityPrincipalToken(
        principal,
        scopes,
        issuedAt,
        expiresAt,
        publicSessionReference,
        extendedBy,
        backwardsCompatibleChain
    )
}

private val authCheckLog = Logger("dk.sdu.cloud.service.ImplementAuthCheckKt")
