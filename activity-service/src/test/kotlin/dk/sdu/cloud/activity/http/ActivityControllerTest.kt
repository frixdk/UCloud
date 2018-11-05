package dk.sdu.cloud.activity.http

import com.fasterxml.jackson.module.kotlin.readValue
import dk.sdu.cloud.Role
import dk.sdu.cloud.activity.api.ActivityEvent
import dk.sdu.cloud.activity.api.ListActivityByIdResponse
import dk.sdu.cloud.activity.services.ActivityService
import dk.sdu.cloud.activity.util.setUser
import dk.sdu.cloud.activity.util.withAuthMock
import dk.sdu.cloud.client.AuthenticatedCloud
import dk.sdu.cloud.client.defaultMapper
import dk.sdu.cloud.service.KafkaServices
import dk.sdu.cloud.service.PaginationRequest
import dk.sdu.cloud.service.ServiceInstance
import dk.sdu.cloud.service.configureControllers
import dk.sdu.cloud.service.installDefaultFeatures
import dk.sdu.cloud.service.paginate
import io.ktor.application.Application
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.routing.routing
import io.ktor.server.testing.TestApplicationRequest
import io.ktor.server.testing.handleRequest
import io.ktor.server.testing.withTestApplication
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Test
import java.util.*
import kotlin.test.assertEquals

class ActivityControllerTest {
    private fun Application.configureWithController(controller: ActivityController<*>) {
        val cloud = mockk<AuthenticatedCloud>(relaxed = true)
        val kafka = mockk<KafkaServices>(relaxed = true)
        val serviceInstance = mockk<ServiceInstance>(relaxed = true)

        installDefaultFeatures(cloud, kafka, serviceInstance)

        routing {
            configureControllers(controller)
        }
    }

    private fun TestApplicationRequest.addJobID() {
        addHeader("Job-Id", UUID.randomUUID().toString())
    }

    @Test
    fun `test listByFileId authenticated`() {
        val activityService: ActivityService<Unit> = mockk()
        val controller = ActivityController(mockk(relaxed = true), activityService)

        withAuthMock {
            withTestApplication(moduleFunction = { configureWithController(controller) }) {
                val fileId = "file"
                val paginationRequest = PaginationRequest().normalize()
                val expectedResult = listOf(ActivityEvent.Download("user1", 0L, fileId)).paginate(paginationRequest)

                every { activityService.findEventsForFileId(any(), any(), any()) } returns expectedResult

                val response = handleRequest(HttpMethod.Get, "/api/activity/by-file-id?id=$fileId") {
                    setUser(role = Role.ADMIN)
                    addJobID()
                }

                assertEquals(HttpStatusCode.OK, response.response.status())

                val parsedResult = defaultMapper.readValue<ListActivityByIdResponse>(response.response.content!!)
                assertEquals(expectedResult, parsedResult)

                verify(exactly = 1) {
                    activityService.findEventsForFileId(
                        any(),
                        match { it.itemsPerPage == paginationRequest.itemsPerPage && it.page == paginationRequest.page },
                        fileId
                    )
                }
            }
        }
    }

    @Test
    fun `test listByFileId not authenticated`() {
        val activityService: ActivityService<Unit> = mockk()
        val controller = ActivityController(mockk(relaxed = true), activityService)

        withAuthMock {
            withTestApplication(moduleFunction = { configureWithController(controller) }) {
                val fileId = "file"
                val response = handleRequest(HttpMethod.Get, "/api/activity/by-file-id?id=$fileId") {
                    setUser(role = Role.USER)
                    addJobID()
                }

                assertEquals(HttpStatusCode.Unauthorized, response.response.status())
            }
        }
    }

    @Test
    fun `test listByPath authenticated`() {
        val activityService: ActivityService<Unit> = mockk()
        val controller = ActivityController(mockk(relaxed = true), activityService)

        withAuthMock {
            withTestApplication(moduleFunction = { configureWithController(controller) }) {
                val path = "/file"
                val paginationRequest = PaginationRequest().normalize()
                val expectedResult = listOf(ActivityEvent.Download("user1", 0L, "123")).paginate(paginationRequest)

                coEvery { activityService.findEventsForPath(any(), any(), path, any(), any()) } returns expectedResult

                val response = handleRequest(HttpMethod.Get, "/api/activity/by-path?path=$path") {
                    setUser()
                    addJobID()
                }

                assertEquals(HttpStatusCode.OK, response.response.status())

                val parsedResult = defaultMapper.readValue<ListActivityByIdResponse>(response.response.content!!)
                assertEquals(expectedResult, parsedResult)

                coVerify(exactly = 1) { activityService.findEventsForPath(any(), any(), path, any(), any()) }
            }
        }
    }

    @Test
    fun `test listByPath not authenticated`() {
        val activityService: ActivityService<Unit> = mockk()
        val controller = ActivityController(mockk(relaxed = true), activityService)

        withAuthMock {
            withTestApplication(moduleFunction = { configureWithController(controller) }) {
                val path = "/file"
                val response = handleRequest(HttpMethod.Get, "/api/activity/by-path?path=$path") {
                    addJobID()
                }

                assertEquals(HttpStatusCode.Unauthorized, response.response.status())
            }
        }
    }
}
