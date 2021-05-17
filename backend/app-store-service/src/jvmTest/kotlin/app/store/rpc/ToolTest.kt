package dk.sdu.cloud.app.store.rpc

import com.fasterxml.jackson.module.kotlin.readValue
import dk.sdu.cloud.app.store.api.*
import dk.sdu.cloud.app.store.services.LogoService
import dk.sdu.cloud.app.store.services.ToolAsyncDao
import dk.sdu.cloud.defaultMapper
import dk.sdu.cloud.service.Page
import dk.sdu.cloud.service.db.async.AsyncDBSessionFactory
import dk.sdu.cloud.service.test.*
import io.ktor.http.*
import io.mockk.coEvery
import io.mockk.mockk
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.decodeFromString
import org.junit.AfterClass
import org.junit.BeforeClass
import org.junit.Test
import kotlin.test.assertEquals

private fun KtorApplicationTestSetupContext.configureToolServer(
    toolDao: ToolAsyncDao,
    db: AsyncDBSessionFactory,
): List<ToolController> {
    val logoService = LogoService(db, mockk(relaxed = true), toolDao)
    return listOf(ToolController(db, toolDao, logoService))
}

class ToolTest {

    companion object {
        private lateinit var embDB: EmbeddedPostgres
        private lateinit var db: AsyncDBSessionFactory

        @BeforeClass
        @JvmStatic
        fun before() {
            val (db, embDB) = TestDB.from(AppStoreServiceDescription)
            this.db = db
            this.embDB = embDB
        }

        @AfterClass
        @JvmStatic
        fun after() {
            runBlocking {
                db.close()
            }
            embDB.close()
        }
    }


    private val normToolDesc = NormalizedToolDescription(
        NameAndVersion("name", "2.2"),
        "container",
        2,
        SimpleDuration(1, 0, 0),
        listOf(""),
        listOf("auther"),
        "title",
        "description",
        ToolBackend.DOCKER,
        "MIT"
    )

    private val tool = Tool(
        "owner",
        1234567,
        123456789,
        normToolDesc
    )

    @Test
    fun `find By name test `() {
        withKtorTest(
            setup = {
                val toolDao = mockk<ToolAsyncDao>()

                coEvery { toolDao.findAllByName(any(), any(), any(), any()) } answers {
                    Page(1, 10, 0, listOf(tool))
                }

                configureToolServer(toolDao, db)
            },

            test = {
                val response = sendRequest(
                    method = HttpMethod.Get,
                    path = "/api/hpc/tools/byName?appName=name&itemsPerPage=10&page=0",
                    user = TestUsers.user
                )
                response.assertSuccess()

                val result = defaultMapper.decodeFromString<Page<Tool>>(response.response.content!!)
                assertEquals(1, result.itemsInTotal)
                assertEquals("owner", result.items.first().owner)
            }
        )
    }

    @Test
    fun `find By name and version test `() {
        withKtorTest(
            setup = {
                val toolDao = mockk<ToolAsyncDao>()

                coEvery { toolDao.findByNameAndVersion(any(), any(), any(), any()) } returns tool

                configureToolServer(toolDao, db)
            },

            test = {
                val response = sendRequest(
                    method = HttpMethod.Get,
                    path = "/api/hpc/tools/byNameAndVersion?name=name&version=2.2",
                    user = TestUsers.user
                )
                response.assertSuccess()

                val results = defaultMapper.decodeFromString<Tool>(response.response.content!!)
                assertEquals("owner", results.owner)
            }
        )
    }

    @Test
    fun `list all test `() {
        withKtorTest(
            setup = {
                val toolDao = mockk<ToolAsyncDao>()

                coEvery { toolDao.listLatestVersion(any(), any(), any()) } answers {
                    Page(1, 10, 0, listOf(tool))
                }

                configureToolServer(toolDao, db)
            },

            test = {
                val response = sendRequest(
                    method = HttpMethod.Get,
                    path = "/api/hpc/tools",
                    user = TestUsers.user
                )
                response.assertSuccess()

                val results = defaultMapper.decodeFromString<Page<Tool>>(response.response.content!!)
                assertEquals(1, results.itemsInTotal)
                assertEquals("owner", results.items.first().owner)
            }
        )
    }

    //TODO NEED SUPPORT FOR YAML CANT TEST
    @Test
    fun `Create test - Cant read YAML`() {
        withKtorTest(
            setup = {
                val toolDao = mockk<ToolAsyncDao>()
                configureToolServer(toolDao, db)
            },

            test = {
                sendRequest(
                    method = HttpMethod.Put,
                    path = "/api/hpc/tools",
                    user = TestUsers.admin
                ).assertStatus(HttpStatusCode.BadRequest)
            }
        )
    }

    @Test
    fun `Create test - not privileged`() {
        withKtorTest(
            setup = {
                val toolDao = mockk<ToolAsyncDao>()
                configureToolServer(toolDao, db)
            },

            test = {
                sendRequest(
                    method = HttpMethod.Put,
                    path = "/api/hpc/tools",
                    user = TestUsers.user
                ).assertStatus(HttpStatusCode.Unauthorized)
            }
        )
    }
}
