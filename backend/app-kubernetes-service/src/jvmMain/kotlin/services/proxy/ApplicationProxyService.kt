package dk.sdu.cloud.app.kubernetes.services.proxy

import dk.sdu.cloud.app.kubernetes.services.ResourceCache
import dk.sdu.cloud.app.kubernetes.services.VerifiedJobCache
import dk.sdu.cloud.calls.RPCException
import dk.sdu.cloud.service.BroadcastingStream
import dk.sdu.cloud.service.Loggable
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Service responsible for matching proxy configuration to cluster state.
 *
 * Actual configuration is performed by [EnvoyConfigurationService] this service simply makes sure state is up-to-date.
 */
class ApplicationProxyService(
    private val envoyConfigurationService: EnvoyConfigurationService,
    private val jobCache: VerifiedJobCache,
    private val tunnelManager: TunnelManager,
    private val broadcastingStream: BroadcastingStream,
    private val resources: ResourceCache,
    private val prefix: String = "app-",
    private val domain: String = "cloud.sdu.dk",
) {
    private val entries = HashMap<String, List<RouteAndCluster>>()
    private val lock = Mutex()

    private suspend fun addEntry(id: String, tunnels: List<Tunnel>, domains: List<String>) {
        require(tunnels.size == domains.size || domains.isEmpty() || (tunnels.size == 1 && domains.isNotEmpty())) {
            "domains must either be empty or tunnels and domains should match in size"
        }

        require(tunnels.all { it.jobId == id }) { "job ids must match" }

        lock.withLock {
            if (entries.containsKey(id)) return

            if (tunnels.size == 1 && domains.isNotEmpty()) {
                entries[id] = domains.mapIndexed { idx, domain ->
                    val tunnel = tunnels.single()
                    RouteAndCluster(
                        EnvoyRoute(
                            domain,
                            tunnel.jobId + "-" + idx
                        ),

                        EnvoyCluster(
                            tunnel.jobId + "-" + idx,
                            tunnel.ipAddress,
                            tunnel.localPort
                        )
                    )
                }
            } else {
                val fullDomains = when {
                    domains.isNotEmpty() -> domains
                    else -> tunnels.map { prefix + id + "-" + it.rank + "." + domain }
                }

                entries[id] = tunnels.zip(fullDomains).map { (tunnel, domain) ->
                    RouteAndCluster(
                        EnvoyRoute(
                            domain,
                            tunnel.jobId + "-" + tunnel.rank
                        ),

                        EnvoyCluster(
                            tunnel.jobId + "-" + tunnel.rank,
                            tunnel.ipAddress,
                            tunnel.localPort
                        )
                    )
                }
            }
        }

        renderConfiguration()
    }

    private suspend fun removeEntry(jobId: String) {
        lock.withLock {
            if (!entries.containsKey(jobId)) return

            entries.remove(jobId)
        }

        renderConfiguration()
    }

    suspend fun initializeListener() {
        broadcastingStream.subscribe(ProxyEvents.events) { event ->
            GlobalScope.launch {
                try {
                    if (event.shouldCreate) {
                        val tunnels = (0 until event.replicas).map { rank ->
                            createOrUseExistingTunnel(event.id, rank)
                        }
                        addEntry(event.id, tunnels, event.domains ?: emptyList())
                    } else {
                        removeEntry(event.id)
                    }
                } catch (ex: Throwable) {
                    log.info("Caught exception while creating tunnel")
                    log.info(ex.stackTraceToString())
                }
            }
        }
    }

    private suspend fun renderConfiguration() {
        // NOTE: There is definitely a limit to how well this will scale. If we have thousands of applications coming
        // up-and-down every second then this approach won't be able to keep up. In this case we really need to
        // implement the xDS services that Envoy would like. We are not currently using this approach as it appears to
        // be significantly more complex to implement and we are on a bit of a tight schedule.

        val allEntries = lock.withLock { entries.map { it.value } }
        val routes = allEntries.flatMap { e -> e.map { it.route } }
        val clusters = allEntries.flatMap { e -> e.map { it.cluster } }
        envoyConfigurationService.configure(routes, clusters)
    }

    private suspend fun createOrUseExistingTunnel(incomingId: String, rank: Int): Tunnel {
        val job = jobCache.findJob(incomingId) ?: throw RPCException.fromStatusCode(HttpStatusCode.NotFound)
        val application = resources.findResources(job).application
        val remotePort = application.invocation.web?.port ?: 80
        return tunnelManager.createOrUseExistingTunnel(incomingId, remotePort, rank)
    }

    companion object : Loggable {
        override val log = logger()
    }
}

private data class RouteAndCluster(val route: EnvoyRoute, val cluster: EnvoyCluster)
