package dk.sdu.cloud.app.orchestrator.services

import com.fasterxml.jackson.module.kotlin.readValue
import dk.sdu.cloud.app.orchestrator.api.JobSortBy
import dk.sdu.cloud.app.orchestrator.api.JobWithStatus
import dk.sdu.cloud.app.orchestrator.api.SortOrder
import dk.sdu.cloud.app.orchestrator.utils.verifiedJob
import dk.sdu.cloud.app.orchestrator.utils.verifiedJobWithAccessToken
import dk.sdu.cloud.app.store.api.SimpleDuration
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.defaultMapper
import dk.sdu.cloud.micro.HibernateFeature
import dk.sdu.cloud.micro.hibernateDatabase
import dk.sdu.cloud.micro.install
import dk.sdu.cloud.service.NormalizedPaginationRequest
import dk.sdu.cloud.service.Page
import dk.sdu.cloud.service.test.TestUsers
import dk.sdu.cloud.service.test.initializeMicro
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.hibernate.Session
import org.junit.Test
import kotlin.test.assertEquals

class JobQueryServiceTest {
    lateinit var daoMock: JobHibernateDao
    lateinit var jobFileMock: JobFileService

    private fun newJobQueryService(): JobQueryService<Session> {
        val micro = initializeMicro()
        micro.install(HibernateFeature)
        daoMock = mockk<JobHibernateDao>()
        jobFileMock = mockk<JobFileService>()
        return JobQueryService(micro.hibernateDatabase, daoMock, jobFileMock)
    }

    @Test
    fun `Find By Id test`() {
        val jobQueryService = newJobQueryService()
        val token = TestUsers.admin.createToken()
        val verifiedJobWithAccessToken = VerifiedJobWithAccessToken(verifiedJob, "access", "refresh")

        coEvery{ daoMock.findOrNull(any(), "job1", token) } answers {
            verifiedJobWithAccessToken
        }
        coEvery { daoMock.find(any(),any(),any()) } answers {
            listOf(verifiedJobWithAccessToken)
        }

        coEvery { jobFileMock.jobFolder(any(), any()) } returns "path/to/jobFolder"

        runBlocking {
            val result = jobQueryService.findById(token, verifiedJob.id)
            println(result)
        }
    }

    @Test (expected = RPCException::class)
    fun `Find By Id test - Not found`() {
        val jobQueryService = newJobQueryService()

        coEvery{ daoMock.find(any(), any(), any()) } returns emptyList()
        runBlocking {
            val result = jobQueryService.findById(TestUsers.admin.createToken(), "job1")

        }
    }

    @Test
    fun `List Recent test - using defualt null values`() {
        val jobQueryService = newJobQueryService()

        coEvery{ daoMock.list(any(), any(), any(), any(), any(), any(), any(), any(),any(), any())} answers {
            Page(
                1,
                10,
                0,
                listOf(
                    verifiedJobWithAccessToken
                )
            )
        }

        coEvery{ jobFileMock.jobFolder(any(), any())} returns "path/to/job/folder"

        runBlocking {
            val results = jobQueryService.listRecent(TestUsers.admin.createToken(), NormalizedPaginationRequest(10, 0))

            assertEquals(1, results.pagesInTotal)
            assertEquals(1, results.itemsInTotal)
        }
    }

    @Test
    fun `List Recent test - specific order and sort`() {
        val jobQueryService = newJobQueryService()

        coEvery{ daoMock.list(any(), any(), any(), any(), any(), any(), any(), any(),any(), any())} answers {
            Page(
                1,
                10,
                0,
                listOf(
                    verifiedJobWithAccessToken.copy(verifiedJob.copy(startedAt = 1234, maxTime = SimpleDuration(1,0,0)))
                )
            )
        }

        coEvery{ jobFileMock.jobFolder(any(), any())} returns "path/to/job/folder"

        runBlocking {
            val results = jobQueryService.listRecent(
                TestUsers.admin.createToken(),
                NormalizedPaginationRequest(10, 0),
                order = SortOrder.ASCENDING,
                sortBy = JobSortBy.NAME
            )

            assertEquals(1, results.pagesInTotal)
            assertEquals(1, results.itemsInTotal)
        }
    }

}
