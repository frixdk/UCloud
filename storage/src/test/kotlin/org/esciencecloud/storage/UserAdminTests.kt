package org.esciencecloud.storage

import org.esciencecloud.storage.server.UserType
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.*

abstract class UserAdminTests {
    abstract val storageConnectionFactory: StorageConnectionFactory
    abstract val adminConn: StorageConnection
    private val adminService by lazy { adminConn.userAdmin!! }

    @Test
    fun testUserCreationAndDeletion() {
        val username = randomUsername()
        adminService.createUser(username, type = UserType.USER)
        adminService.deleteUser(username)
    }

    @Test(expected = PermissionException::class)
    fun testInvalidUserCreation() {
        adminService.createUser(adminConn.connectedUser.name)
    }

    @Test
    fun testCreateAndLogin() {
        val username = randomUsername()
        val password = "securepassword"

        adminService.createUser(username, password)
        val service = storageConnectionFactory.createForAccount(username, password)
        service.fileQuery.listAt(service.paths.homeDirectory)
        service.close()
        adminService.deleteUser(username)
    }

    @Test
    fun testModificationInvalidatesPassword() {
        val username = randomUsername()
        val password = "securepassword"

        adminService.createUser(username, type = UserType.USER)
        adminService.modifyPassword(username, password)
        var service = storageConnectionFactory.createForAccount(username, password)
        service.fileQuery.listAt(service.paths.homeDirectory)
        service.close()

        adminService.modifyPassword(username, "somethingElse")
        var caughtExceptionDuringLogin = false
        try {
            service = storageConnectionFactory.createForAccount(username, password)
            service.fileQuery.listAt(service.paths.homeDirectory)
        } catch (e: Exception) {
            caughtExceptionDuringLogin = true
        }

        adminService.deleteUser(username)
        assertTrue(caughtExceptionDuringLogin)
    }

    @Test(expected = NotFoundException::class)
    fun testModificationOfPasswordOnInvalidUser() {
        adminService.modifyPassword("user_does_not_exist_1235123", "foobar")
    }

    private fun randomUsername(): String {
        val random = Random()
        return "test_user" + random.nextInt(100000)
    }
}