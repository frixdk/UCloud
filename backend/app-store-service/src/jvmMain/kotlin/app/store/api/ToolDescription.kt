package dk.sdu.cloud.app.store.api

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import dk.sdu.cloud.app.store.api.*
import dk.sdu.cloud.service.Loggable

private const val FIELD_MAX_LENGTH = 255

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.EXISTING_PROPERTY,
    property = "tool"
)
@JsonSubTypes(
    JsonSubTypes.Type(value = ToolDescription.V1::class, name = "v1")
)
sealed class ToolDescription(val tool: String) {
    abstract fun normalize(): NormalizedToolDescription

    class V1(
        val name: String,
        val version: String,
        val title: String,
        val container: String?,
        val backend: ToolBackend,
        val authors: List<String>,
        val defaultNumberOfNodes: Int = 1,
        val defaultTimeAllocation: SimpleDuration = SimpleDuration(1, 0, 0),
        val requiredModules: List<String> = emptyList(),
        val description: String = "",
        val license: String = "",
        val image: String? = null,
        val supportedProviders: List<String>? = null,
    ) : ToolDescription("v1") {
        init {
            if (name.length > FIELD_MAX_LENGTH) {
                throw ToolVerificationException.BadValue(::name.name, "Name is too long")
            }

            if (version.length > FIELD_MAX_LENGTH) {
                throw ToolVerificationException.BadValue(::version.name, "Version is too long")
            }

            if (title.length > FIELD_MAX_LENGTH) {
                throw ToolVerificationException.BadValue(::title.name, "Title is too long")
            }

            if (name.isBlank()) throw ToolVerificationException.BadValue(::name.name, "Name is blank")
            if (version.isBlank()) throw ToolVerificationException.BadValue(::version.name, "Version is blank")
            if (title.isBlank()) throw ToolVerificationException.BadValue(::title.name, "Title is blank")

            if (name.contains('\n')) throw ToolVerificationException.BadValue(::name.name, "Name contains newlines")
            if (version.contains('\n')) throw ToolVerificationException.BadValue(
                ::version.name,
                "Version contains newlines"
            )
            if (title.contains('\n')) throw ToolVerificationException.BadValue(::title.name, "Title contains newlines")

            if (authors.isEmpty()) throw ToolVerificationException.BadValue(::authors.name, "Authors is empty")
            val badAuthorIndex = authors.indexOfFirst { it.contains("\n") }
            if (badAuthorIndex != -1) {
                throw ToolVerificationException.BadValue("author[$badAuthorIndex]", "Cannot contain new lines")
            }

            if (container == null && backend in setOf(ToolBackend.DOCKER, ToolBackend.SINGULARITY)) {
                throw ToolVerificationException.BadValue("container", "Missing container")
            }

            if (image == null && backend == ToolBackend.VIRTUAL_MACHINE) {
                throw ToolVerificationException.BadValue(
                    "image",
                    "Image must be provided when using backend = VIRTUAL_MACHINE"
                )
            }

            if (supportedProviders == null && backend == ToolBackend.VIRTUAL_MACHINE) {
                throw ToolVerificationException.BadValue(
                    "supportedProviders",
                    "supportedProviders must be supplied when using backend = VIRTUAL_MACHINE"
                )
            }
        }

        override fun normalize(): NormalizedToolDescription {
            return NormalizedToolDescription(
                NameAndVersion(name, version),
                container,
                defaultNumberOfNodes,
                defaultTimeAllocation,
                requiredModules,
                authors,
                title,
                description,
                backend,
                license,
                image,
                supportedProviders
            )
        }
    }

    companion object : Loggable {
        override val log = logger()
    }
}
