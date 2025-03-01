package dk.sdu.cloud.auth.api

import dk.sdu.cloud.Role
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient

/**
 * Represents a security principal, i.e., any entity which can authenticate with the system. A security principal
 * can be both a person or any other type of non-human entity (Usually other services).
 */
@Serializable
sealed class Principal {
    /**
     * A unique ID for this principal. It should generally not contain sensitive data as this ID will be used a public
     * identifier of a person.
     */
    abstract val id: String

    /**
     * The role of this principle in the entire system. Other services are generally encouraged to implement their
     * own authorization control as opposed to relying on this. This should only be used when more general authorization
     * can be used.
     */
    abstract val role: Role

    /**
     * A unique numeric id for this principal. This is suitable for systems that require numeric identifiers.
     * Use of [id] is strongly preferred.
     */
    @Deprecated("Will be removed in future release")
    abstract val uid: Long

    protected open fun validate() {
        require(id.isNotEmpty()) { "ID cannot be empty!" }
        require(!id.startsWith("__")) { "A principal's ID cannot start with '__'" }
    }
}

@Serializable
sealed class Person : Principal() {
    abstract val title: String?
    abstract val firstNames: String
    abstract val lastName: String
    abstract val phoneNumber: String?
    abstract val orcId: String?
    abstract val email: String?
    abstract val serviceLicenseAgreement: Int

    /**
     * Indicates if the Person is authenticated with more than one factor.
     *
     * A value of true _does not_ mean that TOTP is enabled on the user. Any additional factor provided by the
     * identity provider may count.
     */
    abstract val twoFactorAuthentication: Boolean

    abstract val displayName: String

    override fun validate() {
        super.validate()
        require(!id.startsWith("_")) { "A person's ID cannot start with '_'" }
        require(firstNames.isNotEmpty()) { "First name cannot be empty" }
        require(lastName.isNotEmpty()) { "Last name cannot be empty" }
        require(phoneNumber?.isEmpty() != true) { "Phone number cannot be empty if != null" }
        require(title?.isEmpty() != true) { "Title cannot be empty if != null" }
    }

    /**
     * Represents a [Person] authenticated by WAYF
     */
    @Serializable
    @SerialName("wayf")
    data class ByWAYF(
        override val id: String,
        override val role: Role,
        override val title: String? = null,
        override val firstNames: String,
        override val lastName: String,
        override val phoneNumber: String? = null,
        override val orcId: String? = null,
        override val email: String? = null,
        override val uid: Long = 0,
        override val serviceLicenseAgreement: Int,

        /**
         * Given by WAYF in the property `schacHomeOrganization`
         */
        val organizationId: String,

        /**
         * Given by WAYF in the property `eduPersonTargetedID`
         */
        val wayfId: String
    ) : Person() {
        init {
            validate()

            if (organizationId.isEmpty()) throw IllegalArgumentException("organizationId cannot be empty")
        }

        override val displayName: String = "$firstNames $lastName"

        // NOTE(Dan): WAYF is supposed to bring in additional factors. This should eliminate the need for us to
        //  use our own TOTP solution. It does not appear that we can trust the attribute we get from WAYF.
        //  As a result we have decided to set this to `true` for now.
        override val twoFactorAuthentication = true
    }

    /**
     * Represents a [Person] authenticated by a password
     */
    @Serializable
    @SerialName("password")
    data class ByPassword(
        override val id: String,
        override val role: Role,
        override val title: String? = null,
        override val firstNames: String,
        override val lastName: String,
        override val phoneNumber: String? = null,
        override val orcId: String? = null,
        override val email: String? = null,
        override val uid: Long = 0,
        override val twoFactorAuthentication: Boolean,
        override val serviceLicenseAgreement: Int,

        @Transient
        val password: ByteArray = ByteArray(0),

        @Transient
        val salt: ByteArray = ByteArray(0)
    ) : Person() {
        init {
            validate()
        }

        override val displayName: String = id

        override fun toString(): String {
            return "ByPassword(id='$id', role=$role, title=$title, firstNames='$firstNames', " +
                    "lastName='$lastName', phoneNumber=$phoneNumber, orcId=$orcId, " +
                    "email='$email')"
        }

        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (other == null || this::class != other::class) return false

            other as ByPassword

            if (id != other.id) return false
            if (role != other.role) return false
            if (title != other.title) return false
            if (firstNames != other.firstNames) return false
            if (lastName != other.lastName) return false
            if (phoneNumber != other.phoneNumber) return false
            if (orcId != other.orcId) return false
            if (email != other.email) return false
            if (uid != other.uid) return false
            if (twoFactorAuthentication != other.twoFactorAuthentication) return false
            if (serviceLicenseAgreement != other.serviceLicenseAgreement) return false
            if (displayName != other.displayName) return false

            return true
        }

        override fun hashCode(): Int {
            var result = id.hashCode()
            result = 31 * result + role.hashCode()
            result = 31 * result + (title?.hashCode() ?: 0)
            result = 31 * result + firstNames.hashCode()
            result = 31 * result + lastName.hashCode()
            result = 31 * result + (phoneNumber?.hashCode() ?: 0)
            result = 31 * result + (orcId?.hashCode() ?: 0)
            result = 31 * result + (email?.hashCode() ?: 0)
            result = 31 * result + uid.hashCode()
            result = 31 * result + twoFactorAuthentication.hashCode()
            result = 31 * result + serviceLicenseAgreement
            result = 31 * result + displayName.hashCode()
            return result
        }
    }
}

/**
 * Represents a service
 */
@Serializable
@SerialName("service")
data class ServicePrincipal(
    override val id: String,
    override val role: Role,
) : Principal() {
    @Suppress("OverridingDeprecatedMember")
    override val uid: Long = -1
    init {
        validate()
        require(id.startsWith("_")) { "A service's ID should start with a single underscore" }
    }
}

@Serializable
@SerialName("provider")
data class ProviderPrincipal(
    override val id: String,
) : Principal() {
    override val role: Role = Role.PROVIDER

    @Suppress("OverridingDeprecatedMember")
    override val uid: Long = -1

    init {
        validate()
        require(id.startsWith(AuthProviders.PROVIDER_PREFIX)) {
            "A provider must start with the provider prefix ('${AuthProviders.PROVIDER_PREFIX}')"
        }
    }
}

interface WithAccessToken {
    val accessToken: String
}

interface WithOptionalCsrfToken {
    val csrfToken: String?
}

interface WithOptionalRefreshToken {
    val refreshToken: String?
}

@Serializable
data class RefreshToken(override val refreshToken: String) : WithOptionalRefreshToken {
    override fun toString(): String = "RefreshToken()"
}

@Serializable
data class AccessToken(override val accessToken: String) : WithAccessToken {
    override fun toString(): String = "AccessToken()"
}

@Serializable
data class AccessTokenAndCsrf(
    override val accessToken: String,
    override val csrfToken: String
) : WithAccessToken, WithOptionalCsrfToken {
    override fun toString(): String = "AccessTokenAndCsrf()"
}

@Serializable
data class RefreshTokenAndCsrf(
    override val refreshToken: String,
    override val csrfToken: String? = null,
) : WithOptionalRefreshToken, WithOptionalCsrfToken {
    override fun toString(): String = "RefreshTokenAndCsrf()"
}

@Serializable
data class AuthenticationTokens(
    override val accessToken: String,
    override val refreshToken: String,
    override val csrfToken: String
) : WithAccessToken, WithOptionalCsrfToken, WithOptionalRefreshToken {
    override fun toString() = "AuthenticationTokens()"
}

@Serializable
data class OptionalAuthenticationTokens(
    override val accessToken: String,
    override val csrfToken: String? = null,
    override val refreshToken: String? = null
) : WithAccessToken, WithOptionalCsrfToken, WithOptionalRefreshToken {
    override fun toString() = "OptionalAuthenticationTokens()"
}
