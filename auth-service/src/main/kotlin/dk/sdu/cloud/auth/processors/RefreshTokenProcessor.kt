package dk.sdu.cloud.auth.processors

import dk.sdu.cloud.auth.api.RefreshTokenEvent
import dk.sdu.cloud.auth.services.RefreshTokenAndUser
import dk.sdu.cloud.auth.services.RefreshTokenDAO
import dk.sdu.cloud.service.db.DBSessionFactory
import dk.sdu.cloud.service.db.withTransaction
import org.apache.kafka.streams.kstream.KStream
import org.apache.kafka.streams.kstream.Predicate
import org.slf4j.LoggerFactory

class RefreshTokenProcessor<DBSession>(
    private val db: DBSessionFactory<DBSession>,
    private val refreshTokenDAO: RefreshTokenDAO<DBSession>,
    private val stream: KStream<String, RefreshTokenEvent>
) {
    fun init() {
        log.info("Initializing...")

        val branches = stream.branch(
            Predicate { _, value -> value is RefreshTokenEvent.Created },
            Predicate { _, value -> value is RefreshTokenEvent.Invalidated }
        )

        // TODO We lose the information on who actually caused these events to occur.
        // Should we hook this up to the request ID?
        val createdStream = branches[0].mapValues { it as RefreshTokenEvent.Created }
        val invalidatedStream = branches[1].mapValues { it as RefreshTokenEvent.Invalidated }

        createdStream.foreach { _, value ->
            log.info("Handling event: $value")
            db.withTransaction {
                refreshTokenDAO.insert(it, RefreshTokenAndUser(value.associatedUser, value.token))
            }
        }

        invalidatedStream.foreach { _, value ->
            log.info("Handling event: $value")
            db.withTransaction{ refreshTokenDAO.delete(it, value.token) }
        }

        log.info("Initialized!")
    }

    companion object {
        private val log = LoggerFactory.getLogger(RefreshTokenProcessor::class.java)
    }
}