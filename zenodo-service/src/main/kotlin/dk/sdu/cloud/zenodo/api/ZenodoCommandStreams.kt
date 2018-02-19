package dk.sdu.cloud.zenodo.api

import dk.sdu.cloud.service.KafkaDescriptions

object ZenodoCommandStreams : KafkaDescriptions() {
    val publishCommands = ZenodoDescriptions.publish.mappedAtGateway("zenodoPublish") {
        it.header.uuid to it
    }
}