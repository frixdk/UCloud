package dk.sdu.cloud.person.processors

import dk.sdu.cloud.person.api.PersonEvent
import dk.sdu.cloud.person.api.internal.PersonStreams
import dk.sdu.cloud.person.TokenValidation
import dk.sdu.cloud.person.stream
import dk.sdu.cloud.person.through
import org.apache.kafka.streams.StreamsBuilder

class RequestProcessor {
    fun configure(kStreams: StreamsBuilder) {
        // TODO It is not quite clear to me if it makes sense to report back on authentication failures.
        // I am also not entirely sure how this should be displayed in the user interface.

        // The following snippet takes messages from the command topic and filters out the unauthenticated users.
        // These are then translated into their corresponding event and serialized through a topic (which we can
        // replay). We then consume the events from this topic and write updates to the database.
        kStreams.stream(PersonStreams.PersonCommands)
                .filter { _, request ->
                    TokenValidation.validateOrNull(request.header.performedFor) != null
                }
                .mapValues { it.event }
                .through(PersonStreams.PersonEvents)
                .foreach { _, event ->
                    // NOTE(Dan):
                    //
                    // When handling an event you should generally be careful not to crash. The async nature of our
                    // processing "engine" also means that situations can easily arise where an event stream might
                    // contain events that are no longer legal to perform. For example, an event stream might end up
                    // containing two "create" events. In these cases we should generally just consider the first
                    // one valid and the second invalid (ignore it).
                    //
                    // Talk to me in person if this is confusing.

                    // NOTE(Dan): It is also possible to use `diverge` on the stream when dealing with sealed classes
                    when (event) {
                        // TODO Serialize to database
                        is PersonEvent.Created -> {
                            // Create the project
                        }

                        else -> {
                            // ...
                        }
                    }
                }
    }
}