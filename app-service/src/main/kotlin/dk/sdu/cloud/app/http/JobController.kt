package dk.sdu.cloud.app.http

import dk.sdu.cloud.CommonErrorMessage
import dk.sdu.cloud.app.api.AppRequest
import dk.sdu.cloud.app.api.HPCJobDescriptions
import dk.sdu.cloud.app.api.JobStartedResponse
import dk.sdu.cloud.app.services.JobService
import dk.sdu.cloud.auth.api.validatedPrincipal
import dk.sdu.cloud.service.*
import io.ktor.http.HttpStatusCode
import io.ktor.routing.Route
import io.ktor.routing.route
import org.slf4j.LoggerFactory
import java.util.*

class JobController(
    private val jobService: JobService,
    private val jobRequestProducer: MappedEventProducer<String, KafkaRequest<AppRequest>>
) {
    fun configure(routing: Route) = with(routing) {
        route("jobs") {
            implement(HPCJobDescriptions.findById) {
                logEntry(log, it)
                val user = call.request.validatedPrincipal
                val result = jobService.findJob(it.id, user)
                if (result == null) {
                    error(CommonErrorMessage("Not found"), HttpStatusCode.NotFound)
                } else {
                    ok(result)
                }
            }

            implement(HPCJobDescriptions.listRecent) {
                logEntry(log, it)
                val user = call.request.validatedPrincipal
                ok(jobService.recentJobs(user))
            }

            implement(HPCJobDescriptions.start) { req ->
                logEntry(log, req)

                val uuid = UUID.randomUUID().toString()
                log.info("Starting job: ${call.request.jobId} -> $uuid")

                jobRequestProducer.emit(
                    KafkaRequest(
                        RequestHeader(
                            uuid,
                            call.request.validatedPrincipal.token
                        ),
                        req
                    )
                )

                ok(JobStartedResponse(uuid))
            }
        }
    }

    companion object {
        private val log = LoggerFactory.getLogger(JobController::class.java)
    }
}
