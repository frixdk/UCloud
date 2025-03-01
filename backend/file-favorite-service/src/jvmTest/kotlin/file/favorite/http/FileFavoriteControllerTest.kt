package dk.sdu.cloud.file.favorite.http

import com.fasterxml.jackson.module.kotlin.readValue
import dk.sdu.cloud.calls.client.withoutAuthentication
import dk.sdu.cloud.defaultMapper
import dk.sdu.cloud.file.api.StorageFile
import dk.sdu.cloud.file.api.mergeWith
import dk.sdu.cloud.file.api.path
import dk.sdu.cloud.file.favorite.api.FavoriteStatusRequest
import dk.sdu.cloud.file.favorite.api.FavoriteStatusResponse
import dk.sdu.cloud.file.favorite.api.ToggleFavoriteResponse
import dk.sdu.cloud.file.favorite.services.FileFavoriteService
import dk.sdu.cloud.file.favorite.storageFile
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.service.test.ClientMock
import dk.sdu.cloud.service.test.KtorApplicationTestSetupContext
import dk.sdu.cloud.service.test.TestUsers
import dk.sdu.cloud.service.test.assertSuccess
import dk.sdu.cloud.service.test.parseSuccessful
import dk.sdu.cloud.service.test.sendJson
import dk.sdu.cloud.service.test.sendRequest
import dk.sdu.cloud.service.test.withKtorTest
import io.ktor.http.HttpMethod
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.serialization.decodeFromString
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FileFavoriteControllerTest {
    private val service = mockk<FileFavoriteService>()
    private val cloud = ClientMock.authenticatedClient
    private val setup: KtorApplicationTestSetupContext.() -> List<Controller> = {
        listOf(FileFavoriteController(service, cloud.withoutAuthentication()))
    }

    @Test
    fun `Toggle test`() {
        withKtorTest(
            setup,
            test = {
                coEvery { service.toggleFavorite(any(), any(), any()) } answers {
                    emptyList()
                }

                val request = sendRequest(
                    method = HttpMethod.Post,
                    path = "/api/files/favorite/toggle",
                    user = TestUsers.user,
                    params = mapOf(
                        "path" to "/home/user/1,/home/user/2"
                    )
                )

                val response = request.parseSuccessful<ToggleFavoriteResponse>()
                assertTrue(response.failures.isEmpty())
            }
        )
    }

    @Test
    fun `Toggle test - failed instances`() {
        withKtorTest(
            setup,
            test = {
                coEvery { service.toggleFavorite(any(), any(), any()) } answers {
                    listOf("/home/user/1")
                }

                val request = sendRequest(
                    method = HttpMethod.Post,
                    path = "/api/files/favorite/toggle",
                    user = TestUsers.user,
                    params = mapOf(
                        "path" to "/home/user/1,/home/user/2"
                    )
                )

                request.assertSuccess()
                val response = defaultMapper.decodeFromString<ToggleFavoriteResponse>(request.response.content!!)
                assertEquals(1, response.failures.size)
                assertEquals("/home/user/1", response.failures.first())
            }
        )
    }

    @Test
    fun `isFavorite test - failed instances`() {
        withKtorTest(
            setup,
            test = {
                coEvery { service.getFavoriteStatus(any(), any()) } answers {
                    mapOf(
                        "fileId" to true,
                        "fileId2" to false
                    )
                }

                val request = sendJson(
                    method = HttpMethod.Post,
                    path = "/api/files/favorite/status",
                    user = TestUsers.user,
                    request = FavoriteStatusRequest(
                        listOf(
                            storageFile.path,
                            StorageFile(pathOrNull = "/home/user/5").mergeWith(storageFile).path
                        )
                    )
                )

                request.assertSuccess()
                val response = defaultMapper.decodeFromString<FavoriteStatusResponse>(request.response.content!!)
                assertEquals(true, response.favorited["fileId"])
                assertEquals(false, response.favorited["fileId2"])
            }
        )
    }
}
