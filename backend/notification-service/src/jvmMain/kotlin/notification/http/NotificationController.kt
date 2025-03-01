package dk.sdu.cloud.notification.http

import dk.sdu.cloud.calls.server.RpcServer
import dk.sdu.cloud.calls.server.WSCall
import dk.sdu.cloud.calls.server.securityPrincipal
import dk.sdu.cloud.calls.server.withContext
import dk.sdu.cloud.notification.api.DeleteResponse
import dk.sdu.cloud.notification.api.MarkResponse
import dk.sdu.cloud.notification.api.NotificationDescriptions
import dk.sdu.cloud.notification.api.normalizedIds
import dk.sdu.cloud.notification.services.NotificationService
import dk.sdu.cloud.notification.services.SubscriptionService
import dk.sdu.cloud.service.Controller
import dk.sdu.cloud.service.Loggable
import kotlinx.coroutines.delay

class NotificationController(
    private val service: NotificationService,
    private val subscriptionService: SubscriptionService
) : Controller {
    override fun configure(rpcServer: RpcServer) = with(rpcServer) {
        implement(NotificationDescriptions.list) {
            ok(
                service.listNotifications(
                    ctx.securityPrincipal.username,
                    request.type,
                    request.since,
                    request.normalize()
                )
            )
        }

        implement(NotificationDescriptions.markAsRead) {
            ok(
                MarkResponse(
                    service.markAsRead(
                        ctx.securityPrincipal.username,
                        request.normalizedIds
                    )
                )
            )
        }

        implement(NotificationDescriptions.markAllAsRead) {
            service.markAllAsRead(ctx.securityPrincipal.username)
            ok(Unit)
        }

        implement(NotificationDescriptions.create) {
            ok(service.createNotification(request.user, request.notification))
        }

        implement(NotificationDescriptions.delete) {
            ok(DeleteResponse(service.deleteNotifications(request.normalizedIds)))
        }

        implement(NotificationDescriptions.subscription) {
            val username = ctx.securityPrincipal.username
            withContext<WSCall> {
                ctx.session.addOnCloseHandler {
                    subscriptionService.onDisconnect(ctx.session)
                }
            }

            subscriptionService.onConnection(username, this@implement)

            while (true) {
                delay(1000)
            }
        }

        implement(NotificationDescriptions.internalNotification) {
            subscriptionService.onNotification(request.user, request.notification, allowRemoteCalls = false)
            ok(Unit)
        }
    }

    companion object : Loggable {
        override val log = logger()
    }
}
