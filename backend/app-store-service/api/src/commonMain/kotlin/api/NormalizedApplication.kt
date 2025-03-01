package dk.sdu.cloud.app.store.api

import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient

@Serializable
data class ApplicationMetadata(
    override val name: String,
    override val version: String,

    val authors: List<String>,

    val title: String,
    val description: String,
    val website: String? = null,
    val public: Boolean
) : WithNameAndVersion {
    @Deprecated("Replaced with public") @Transient val isPublic = public
}


@Serializable
data class VncDescription(
    val password: String? = null,
    val port: Int = 5900
)

@Serializable
data class WebDescription(
    val port: Int = 80
)

@Serializable
data class ContainerDescription(
    val changeWorkingDirectory: Boolean = true,
    val runAsRoot: Boolean = false,
    val runAsRealUser: Boolean = false
) {
    init {
        if (runAsRoot && runAsRealUser) {
            throw ApplicationVerificationException.BadValue(
                "container.runAsRoot/container.runAsRealUser",
                "Cannot runAsRoot and runAsRealUser. These are mutually exclusive."
            )
        }
    }
}

@Serializable
data class ApplicationInvocationDescription(
    val tool: ToolReference,
    val invocation: List<InvocationParameter>,
    val parameters: List<ApplicationParameter>,
    val outputFileGlobs: List<String>,
    val applicationType: ApplicationType = ApplicationType.BATCH,
    val vnc: VncDescription? = null,
    val web: WebDescription? = null,
    val container: ContainerDescription? = null,
    val environment: Map<String, InvocationParameter>? = null,
    private val allowAdditionalMounts: Boolean? = null,
    private val allowAdditionalPeers: Boolean? = null,
    val allowMultiNode: Boolean = false,
    val fileExtensions: List<String> = emptyList(),
    val licenseServers: List<String> = emptyList()
) {
    val shouldAllowAdditionalMounts: Boolean
        get() {
            if (allowAdditionalMounts != null) return allowAdditionalMounts
            return applicationType in setOf(ApplicationType.VNC, ApplicationType.WEB)
        }

    val shouldAllowAdditionalPeers: Boolean
        get() {
            if (allowAdditionalPeers != null) return allowAdditionalPeers
            return applicationType in setOf(ApplicationType.VNC, ApplicationType.WEB, ApplicationType.BATCH)
        }
}

interface WithAppMetadata {
    val metadata: ApplicationMetadata
}

interface WithAppInvocation {
    val invocation: ApplicationInvocationDescription
}

interface WithAppFavorite {
    val favorite: Boolean
}

interface WithAllAppTags {
    val tags: List<String>
}

@Serializable
data class ApplicationSummary(
    override val metadata: ApplicationMetadata
) : WithAppMetadata

@Serializable
data class Application(
    override val metadata: ApplicationMetadata,
    override val invocation: ApplicationInvocationDescription
) : WithAppMetadata, WithAppInvocation {
    fun withoutInvocation(): ApplicationSummary = ApplicationSummary(metadata)
}

@Serializable
data class ApplicationWithExtension(
    override val metadata: ApplicationMetadata,
    val extensions: List<String>
) : WithAppMetadata

@Serializable
data class ApplicationWithFavoriteAndTags(
    override val metadata: ApplicationMetadata,
    override val invocation: ApplicationInvocationDescription,
    override val favorite: Boolean,
    override val tags: List<String>
) : WithAppMetadata, WithAppInvocation, WithAppFavorite, WithAllAppTags {
    fun withoutInvocation(): ApplicationSummaryWithFavorite = ApplicationSummaryWithFavorite(metadata, favorite, tags)
}

@Serializable
data class ApplicationSummaryWithFavorite(
    override val metadata: ApplicationMetadata,
    override val favorite: Boolean,
    override val tags: List<String>
) : WithAppMetadata, WithAppFavorite, WithAllAppTags
