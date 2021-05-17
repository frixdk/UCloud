package dk.sdu.cloud.file.api

import dk.sdu.cloud.calls.RPCException
import io.ktor.http.HttpStatusCode

fun homeDirectory(user: String): String = "/home/$user/"
fun projectHomeDirectory(projectId: String): String = "/projects/$projectId"
fun personalDirectory(projectId: String, username: String) =
    joinPath(projectHomeDirectory(projectId), PERSONAL_REPOSITORY, username)

fun projectIdFromPath(path: String): String? {
    val normalizedComponents = path.normalize().components()
    if (normalizedComponents.size < 2) return null
    if (normalizedComponents[0] != "projects") return null
    return normalizedComponents[1]
}

fun usernameFromPath(path: String): String? {
    val normalizedComponents = path.normalize().components()
    if (normalizedComponents.size < 2) return null
    if (normalizedComponents[0] != "home") return null
    return normalizedComponents[1]
}

fun findHomeDirectoryFromPath(path: String): String {
    val components = path.components()
    if (components.size < 2) throw RPCException("Could not find home directory for path", HttpStatusCode.BadRequest)
    return when (components[0]) {
        "home", "projects" -> "/" + listOf(components[0], components[1]).joinToString("/")
        else -> throw RPCException("Could not find home directory for path", HttpStatusCode.BadRequest)
    }
}

fun joinPath(vararg components: String, isDirectory: Boolean = false): String {
    val basePath = components.map {
        it.removeSuffix("/")
    }.joinToString("/") + (if (isDirectory) "/" else "").normalize()
    return if (basePath.startsWith("/")) basePath
    else "/$basePath"
}

fun String.parents(): List<String> {
    val components = components().dropLast(1)
    return components.mapIndexed { index, _ ->
        val path = "/" + components.subList(0, index + 1).joinToString("/").removePrefix("/")
        if (path == "/") path else "$path/"
    }
}

fun String.parent(): String {
    val components = components().dropLast(1)
    if (components.isEmpty()) return "/"

    val path = "/" + components.joinToString("/").removePrefix("/")
    return if (path == "/") path else "$path/"
}

fun String.components(): List<String> = removePrefix("/").removeSuffix("/").split("/")

fun String.fileName(): String = substringAfterLast('/')

fun String.normalize(): String {
    val inputComponents = components()
    val reconstructedComponents = ArrayList<String>()

    for (component in inputComponents) {
        when (component) {
            ".", "" -> {
                // Do nothing
            }

            ".." -> {
                if (reconstructedComponents.isNotEmpty()) {
                    reconstructedComponents.removeAt(reconstructedComponents.lastIndex)
                }
            }

            else -> reconstructedComponents.add(component)
        }
    }

    return "/" + reconstructedComponents.joinToString("/")
}

fun relativize(parentPath: String, childPath: String): String {
    val rootNormalized = parentPath.normalize()
    val rootComponents = rootNormalized.components()
    val childNormalized = childPath.normalize()
    val childComponents = childNormalized.components()

    // Throw exception if child is not a child of root
    require(rootNormalized.length <= childNormalized.length || rootComponents.size < childComponents.size) {
        "child is not a child of parent ($childPath !in $parentPath)"
    }

    // Throw exception if child is not a child of root
    for (i in rootComponents.indices) {
        require(rootComponents[i] == childComponents[i]) {
            "child is not a child of parent ($childPath !in $parentPath)"
        }
    }

    return "./" + childComponents.takeLast(childComponents.size - rootComponents.size).joinToString("/")
}
