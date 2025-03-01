package dk.sdu.cloud.elastic.management.services

import dk.sdu.cloud.service.Loggable
import dk.sdu.cloud.service.Time
import org.elasticsearch.client.RequestOptions
import org.elasticsearch.client.RestClient
import org.elasticsearch.client.RestHighLevelClient
import org.elasticsearch.client.core.CountRequest
import org.elasticsearch.index.query.QueryBuilders
import org.elasticsearch.index.reindex.DeleteByQueryRequest
import org.slf4j.Logger
import java.time.LocalDate

class ExpiredEntriesDeleteService(
    private val elastic: RestHighLevelClient
) {

    private fun deleteExpired(index: String) {
        val date = Time.now()

        val expiredCount = elastic.count(
            CountRequest().query(
                QueryBuilders.rangeQuery("expiry")
                        .lte(date)
            ).indices(index),
            RequestOptions.DEFAULT
        ).count

        val sizeOfIndex = elastic.count(
            CountRequest().query(
                QueryBuilders.matchAllQuery()
            ).indices(index),
            RequestOptions.DEFAULT
        ).count

        if (expiredCount == 0L) {
            log.info("Nothing expired in index - moving on")
            return
        }

        if (sizeOfIndex == expiredCount) {
            log.info("All doc expired - faster to delete index")
            deleteIndex(index, elastic)
        } else {
            val request = DeleteByQueryRequest(index)
            request.setQuery(
                QueryBuilders.rangeQuery("expiry")
                    .lte(date)
            )

            elastic.deleteByQuery(request, RequestOptions.DEFAULT)
            flushIndex(elastic, index)
        }
    }

    fun deleteOldRancherLogs() {
        val currentDate = LocalDate.now()
        val daysToSave = 180

        val indexToDelete = if (indexExists("development_default-*", elastic))
            "development_default-${currentDate.minusDays(daysToSave.toLong())}*"
        else
            "kubernetes-production-${currentDate.minusDays(daysToSave.toLong())}*"

        if (!indexExists(indexToDelete, elastic)) {
            log.info("no index with the name $indexToDelete")
            return
        }
        deleteIndex(indexToDelete, elastic)
    }

    fun deleteOldFileBeatLogs() {
        val datePeriodFormat = LocalDate.now().minusDays(180).toString().replace("-","." )

        val indexToDelete = "filebeat-${datePeriodFormat}*"

        if (!indexExists(indexToDelete, elastic)) {
            log.info("no index with the name $indexToDelete")
            return
        }
        deleteIndex(indexToDelete, elastic)
    }

    fun deleteOldInfrastructureLogs() {
        val datePeriodFormat = LocalDate.now().minusDays(180).toString().replace("-","." )

        val indexToDelete = "infrastructure-${datePeriodFormat}*"

        if (!indexExists(indexToDelete, elastic)) {
            log.info("no index with the name $indexToDelete")
            return
        }
        deleteIndex(indexToDelete, elastic)
    }

    fun deleteExpiredAllIndices() {
        val list = getListOfIndices(elastic, "*")
        list.forEach {
            log.info("Finding expired entries in $it")
            deleteExpired(it)
        }
    }

    fun deleteAllEmptyIndices(lowLevelRestClient: RestClient) {
        val list = getListOfIndices(elastic, "*")
        list.forEach {
            if (getDocumentCountSum(listOf(it), lowLevelRestClient) == 0) {
                deleteIndex(it, elastic)
            }
        }
    }

    companion object : Loggable {
        override val log: Logger = logger()
    }
}
