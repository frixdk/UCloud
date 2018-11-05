package dk.sdu.cloud.storage.http.share

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import dk.sdu.cloud.Role
import dk.sdu.cloud.auth.api.LookupUsersRequest
import dk.sdu.cloud.auth.api.LookupUsersResponse
import dk.sdu.cloud.auth.api.UserDescriptions
import dk.sdu.cloud.auth.api.UserLookup
import dk.sdu.cloud.client.RESTResponse
import dk.sdu.cloud.notification.api.FindByNotificationId
import dk.sdu.cloud.notification.api.NotificationDescriptions
import dk.sdu.cloud.service.Page
import dk.sdu.cloud.service.configureControllers
import dk.sdu.cloud.service.db.H2_TEST_CONFIG
import dk.sdu.cloud.service.db.HibernateSessionFactory
import dk.sdu.cloud.share.api.FindByShareId
import dk.sdu.cloud.share.api.SharesByPath
import dk.sdu.cloud.storage.http.ShareController
import dk.sdu.cloud.storage.http.files.call
import dk.sdu.cloud.storage.http.files.configureServerWithFileController
import dk.sdu.cloud.storage.http.files.setUser
import dk.sdu.cloud.storage.services.ACLService
import dk.sdu.cloud.storage.services.ShareException
import dk.sdu.cloud.storage.services.ShareHibernateDAO
import dk.sdu.cloud.storage.services.ShareService
import dk.sdu.cloud.storage.util.cloudToCephFsDAOWithFixedAnswer
import dk.sdu.cloud.storage.util.withAuthMock
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.TestApplicationEngine
import io.ktor.server.testing.TestApplicationResponse
import io.ktor.server.testing.handleRequest
import io.ktor.server.testing.setBody
import io.ktor.server.testing.withTestApplication
import io.mockk.coEvery
import io.mockk.mockk
import io.mockk.objectMockk
import io.mockk.use
import org.junit.Ignore
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ShareTests {

    private fun TestApplicationEngine.createShare(
        path: String,
        userToRunAs: String = "user",
        userToShareWith: String = "user1"
    ): TestApplicationResponse {
        return handleRequest(HttpMethod.Put, "/api/shares") {
            setUser(userToRunAs, Role.USER)
            setBody(
                """
                    {
                    "sharedWith" : "$userToShareWith",
                    "path" : "$path",
                    "rights" : ["READ", "EXECUTE"]
                    }
                    """.trimIndent()
            )
        }.response
    }


    @Test
    fun createListAndAcceptTest() {
        objectMockk(NotificationDescriptions, UserDescriptions).use {
            coEvery { NotificationDescriptions.create.call(any(), any()) } answers {
                RESTResponse.Ok(
                    mockk(relaxed = true),
                    FindByNotificationId(0)
                )
            }

            coEvery { UserDescriptions.lookupUsers.call(any(), any()) } answers {
                val payload = args.first() as LookupUsersRequest

                RESTResponse.Ok(
                    mockk(relaxed = true),
                    LookupUsersResponse(payload.users.map { it to UserLookup(it, Role.USER) }.toMap())
                )
            }

            withAuthMock {
                val userToRunAs = "user"
                val userToShareWith = "user1"

                withTestApplication(
                    moduleFunction = {
                        configureServerWithFileController(
                            userDao = cloudToCephFsDAOWithFixedAnswer(userToRunAs)
                        ) {
                            val db = HibernateSessionFactory.create(
                                H2_TEST_CONFIG.copy(
                                    usePool = false,
                                    showSQLInStdout = true
                                )
                            )
                            val aclService = ACLService(it.fs)
                            val shareService = ShareService(db, ShareHibernateDAO(), it.runner, aclService, it.coreFs)

                            configureControllers(ShareController(shareService, it.runner))
                        }
                    },

                    test = {

                        run {
                            val getByPathResponse = handleRequest(HttpMethod.Get,
                                "api/shares/byPath?path=/home/$userToShareWith/folder/a") {
                                setUser(userToRunAs, Role.USER)
                            }.response

                            assertEquals(HttpStatusCode.NotFound, getByPathResponse.status())
                        }

                        val createResponse = createShare("/home/$userToShareWith/folder/a")

                        assertEquals(HttpStatusCode.OK, createResponse.status())

                        val mapper = jacksonObjectMapper()
                        val id = createResponse.content!!.let { mapper.readValue<FindByShareId>(it).id }

                        run {
                            val getByPathResponse = handleRequest(HttpMethod.Get,
                                "api/shares/byPath?path=/home/$userToShareWith/folder/a") {
                                setUser(userToRunAs, Role.USER)
                            }.response

                            assertEquals(HttpStatusCode.OK, getByPathResponse.status())
                        }

                        run {
                            val getResponse = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                                setUser(userToRunAs, Role.USER)
                            }.response

                            assertEquals(HttpStatusCode.OK, getResponse.status())
                        }

                        run {
                            val listByStatusResponse = handleRequest(HttpMethod.Get, "api/shares/ACCEPTED") {
                                setUser(userToRunAs, Role.USER)
                            }.response

                            assertEquals(HttpStatusCode.OK, listByStatusResponse.status())
                            val obj = mapper.readTree(listByStatusResponse.content)
                            assertEquals(0, obj["itemsInTotal"].asInt())
                            assertTrue(obj["items"].toList().isEmpty())

                        }

                        run {
                            val acceptedResponse = handleRequest(HttpMethod.Post, "/api/shares/accept/$id") {
                                setUser(userToShareWith, Role.USER)
                            }.response

                            assertEquals(HttpStatusCode.OK, acceptedResponse.status())
                        }

                        run {
                            val listByStatusResponse = handleRequest(HttpMethod.Get, "api/shares/ACCEPTED") {
                                setUser(userToRunAs, Role.USER)
                            }.response

                            assertEquals(HttpStatusCode.OK, listByStatusResponse.status())
                            val obj = mapper.readTree(listByStatusResponse.content)
                            assertEquals(1, obj["itemsInTotal"].asInt())
                            assertFalse(obj["items"].toList().isEmpty())
                            assertEquals("/home/user1/folder/a", obj["items"].first().first().textValue())
                        }

                        run {
                            val getRespose = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                                setUser(userToShareWith, Role.USER)
                            }.response

                            assertEquals(HttpStatusCode.OK, getRespose.status())
                            val obj = mapper.readValue<Page<SharesByPath>>(getRespose.content!!)
                            val share = obj.items.first().shares.find { it.id == id }
                            assertEquals(share?.state.toString(), "ACCEPTED")
                        }
                    }
                )
            }
        }
    }

    @Ignore
    @Test
    fun `Test Sorting of shares`() {
        objectMockk(NotificationDescriptions, UserDescriptions).use {
            coEvery { NotificationDescriptions.create.call(any(), any()) } answers {
                RESTResponse.Ok(
                    mockk(relaxed = true),
                    FindByNotificationId(0)
                )
            }

            coEvery { UserDescriptions.lookupUsers.call(any(), any()) } answers {
                val payload = args.first() as LookupUsersRequest

                RESTResponse.Ok(
                    mockk(relaxed = true),
                    LookupUsersResponse(payload.users.map { it to UserLookup(it, Role.USER) }.toMap())
                )
            }

            withAuthMock {
                val userToRunAs = "user"
                val userToShareWith = "user1"

                withTestApplication(
                    moduleFunction = {
                        configureServerWithFileController(
                            userDao = cloudToCephFsDAOWithFixedAnswer(userToRunAs)
                        ) {
                            val db = HibernateSessionFactory.create(
                                H2_TEST_CONFIG.copy(
                                    usePool = false,
                                    showSQLInStdout = true
                                )
                            )
                            val aclService = ACLService(it.fs)
                            val shareService = ShareService(db, ShareHibernateDAO(), it.runner, aclService, it.coreFs)

                            configureControllers(ShareController(shareService, it.runner))
                        }
                    },

                    test = {
                        val insertResponse = createShare("/home/$userToShareWith/folder/a")
                        assertEquals(HttpStatusCode.OK, insertResponse.status())

                        val insertResponse2 = createShare("/home/$userToShareWith/folder/c")
                        assertEquals(HttpStatusCode.OK, insertResponse2.status())

                        val insertResponse3 = createShare("/home/$userToShareWith/folder/b")

                        assertEquals(HttpStatusCode.OK, insertResponse3.status())

                        val insertResponse4 = createShare("/home/$userToShareWith/another-one/file")

                        assertEquals(HttpStatusCode.OK, insertResponse4.status())

                        val mapper = jacksonObjectMapper()

                        val getResponse = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                            setUser(userToRunAs, Role.USER)
                        }.response
                        println(getResponse.content)
                        assertEquals(HttpStatusCode.OK, getResponse.status())

                        val obj = mapper.readValue<Page<SharesByPath>>(getResponse.content!!)
                        obj.items.forEach {
                            println(it)
                        }
                        assertEquals("/home/user1/folder/a", obj.items[0].path)
                        assertEquals("/home/user1/folder/b", obj.items[1].path)
                        assertEquals("/home/user1/folder/c", obj.items[2].path)
                        assertEquals("/home/user1/another-one/file", obj.items[3].path)

                    }
                )
            }
        }
    }

    @Test
    fun `Test Sorting of shares - page test`() {
        objectMockk(NotificationDescriptions, UserDescriptions).use {
            coEvery { NotificationDescriptions.create.call(any(), any()) } answers {
                RESTResponse.Ok(
                    mockk(relaxed = true),
                    FindByNotificationId(0)
                )
            }

            coEvery { UserDescriptions.lookupUsers.call(any(), any()) } answers {
                val payload = args.first() as LookupUsersRequest

                RESTResponse.Ok(
                    mockk(relaxed = true),
                    LookupUsersResponse(payload.users.map { it to UserLookup(it, Role.USER) }.toMap())
                )
            }

            withAuthMock {
                val userToRunAs = "user"
                val userToShareWith = "user1"

                withTestApplication(
                    moduleFunction = {
                        configureServerWithFileController(
                            userDao = cloudToCephFsDAOWithFixedAnswer(userToRunAs)
                        ) {
                            val db = HibernateSessionFactory.create(
                                H2_TEST_CONFIG.copy(
                                    usePool = false,
                                    showSQLInStdout = true
                                )
                            )
                            val aclService = ACLService(it.fs)
                            val shareService = ShareService(db, ShareHibernateDAO(), it.runner, aclService, it.coreFs)

                            configureControllers(ShareController(shareService, it.runner))
                        }
                    },

                    test = {
                        val insertResponse = createShare("/home/$userToShareWith/folder/a")
                        assertEquals(HttpStatusCode.OK, insertResponse.status())

                        val insertResponse2 = createShare("/home/$userToShareWith/folder/c")
                        assertEquals(HttpStatusCode.OK, insertResponse2.status())

                        val insertResponse3 = createShare("/home/$userToShareWith/folder/b")

                        assertEquals(HttpStatusCode.OK, insertResponse3.status())

                        val insertResponse4 = createShare("/home/$userToShareWith/another-one/b")

                        assertEquals(HttpStatusCode.OK, insertResponse4.status())

                        val insertResponse5 = createShare("/home/$userToShareWith/folder/d")

                        assertEquals(HttpStatusCode.OK, insertResponse5.status())

                        val insertResponse6 = createShare("/home/$userToShareWith/another-one/g")

                        assertEquals(HttpStatusCode.OK, insertResponse6.status())

                        val insertResponse7 = createShare("/home/$userToShareWith/one/a")

                        assertEquals(HttpStatusCode.OK, insertResponse7.status())

                        val insertResponse8 = createShare("/home/$userToShareWith/one/i")

                        assertEquals(HttpStatusCode.OK, insertResponse8.status())

                        val insertResponse9 = createShare("/home/$userToShareWith/one/file")

                        assertEquals(HttpStatusCode.OK, insertResponse9.status())

                        val insertResponse10 = createShare("/home/$userToShareWith/one/j")

                        assertEquals(HttpStatusCode.OK, insertResponse10.status())

                        val insertResponse11 = createShare("/home/$userToShareWith/another-one/h")

                        assertEquals(HttpStatusCode.OK, insertResponse11.status())

                        val insertResponse12 = createShare("/home/$userToShareWith/folder/e")

                        assertEquals(HttpStatusCode.OK, insertResponse12.status())

                        val mapper = jacksonObjectMapper()

                        val getResponse = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                            setUser(userToRunAs, Role.USER)
                        }.response

                        assertEquals(HttpStatusCode.OK, getResponse.status())

                        val obj = mapper.readValue<Page<SharesByPath>>(getResponse.content!!)

                        assertEquals("/home/user1/folder/a", obj.items[0].path)
                        assertEquals("/home/user1/one/a", obj.items[1].path)
                        assertEquals("/home/user1/folder/b", obj.items[2].path)
                        assertEquals("/home/user1/another-one/b", obj.items[3].path)
                        assertEquals("/home/user1/folder/c", obj.items[4].path)
                        assertEquals("/home/user1/folder/d", obj.items[5].path)
                        assertEquals("/home/user1/folder/e", obj.items[6].path)
                        assertEquals("/home/user1/one/file", obj.items[7].path)
                        assertEquals("/home/user1/another-one/g", obj.items[8].path)
                        assertEquals("/home/user1/another-one/h", obj.items[9].path)

                        val getResponse2 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=1") {
                            setUser(userToRunAs, Role.USER)
                        }.response
                        assertEquals(HttpStatusCode.OK, getResponse2.status())

                        val obj2 = mapper.readValue<Page<SharesByPath>>(getResponse2.content!!)

                        assertEquals("/home/user1/one/i", obj2.items[0].path)
                        assertEquals("/home/user1/one/j", obj2.items[1].path)
                    }
                )
            }
        }
    }

    @Test
    fun `Test sharing with yourself`() {
        objectMockk(NotificationDescriptions, UserDescriptions).use {
            coEvery { NotificationDescriptions.create.call(any(), any()) } answers {
                RESTResponse.Ok(
                    mockk(relaxed = true),
                    FindByNotificationId(0)
                )
            }

            coEvery { UserDescriptions.lookupUsers.call(any(), any()) } answers {
                val payload = args.first() as LookupUsersRequest

                RESTResponse.Ok(
                    mockk(relaxed = true),
                    LookupUsersResponse(payload.users.map { it to UserLookup(it, Role.USER) }.toMap())
                )
            }

            withAuthMock {
                val user = "user1"

                withTestApplication(
                    moduleFunction = {
                        configureServerWithFileController(
                            userDao = cloudToCephFsDAOWithFixedAnswer(user)
                        ) {
                            val db = HibernateSessionFactory.create(
                                H2_TEST_CONFIG.copy(
                                    usePool = false,
                                    showSQLInStdout = true
                                )
                            )
                            val aclService = ACLService(it.fs)
                            val shareService = ShareService(db, ShareHibernateDAO(), it.runner, aclService, it.coreFs)

                            configureControllers(ShareController(shareService, it.runner))
                        }
                    },

                    test = {
                        val insertResponse = createShare("/home/$user/folder/a", user, user)
                        assertEquals(HttpStatusCode.BadRequest, insertResponse.status())
                    }
                )
            }
        }
    }

    @Test
    fun `Test create - duplicate`() {
        objectMockk(NotificationDescriptions, UserDescriptions).use {
            coEvery { NotificationDescriptions.create.call(any(), any()) } answers {
                RESTResponse.Ok(
                    mockk(relaxed = true),
                    FindByNotificationId(0)
                )
            }

            coEvery { UserDescriptions.lookupUsers.call(any(), any()) } answers {
                val payload = args.first() as LookupUsersRequest

                RESTResponse.Ok(
                    mockk(relaxed = true),
                    LookupUsersResponse(payload.users.map { it to UserLookup(it, Role.USER) }.toMap())
                )
            }

            withAuthMock {
                val userToRunAs = "user"
                val userToShareWith = "user1"

                withTestApplication(
                    moduleFunction = {
                        configureServerWithFileController(
                            userDao = cloudToCephFsDAOWithFixedAnswer(userToRunAs)
                        ) {
                            val db = HibernateSessionFactory.create(
                                H2_TEST_CONFIG.copy(
                                    usePool = false,
                                    showSQLInStdout = true
                                )
                            )
                            val aclService = ACLService(it.fs)
                            val shareService = ShareService(db, ShareHibernateDAO(), it.runner, aclService, it.coreFs)

                            configureControllers(ShareController(shareService, it.runner))
                        }
                    },

                    test = {
                        run {
                            val insertResponse = createShare("/home/$userToShareWith/folder/a")
                            assertEquals(HttpStatusCode.OK, insertResponse.status())
                        }

                        run {
                            val insertResponse = createShare("/home/$userToShareWith/folder/a")
                            assertEquals(HttpStatusCode.Conflict, insertResponse.status())
                        }
                    }
                )
            }
        }
    }
    /*
    @Test
    fun createNotOwnerOfFilesTest() {
        withAuthMock {
            withTestApplication(
                moduleFunction = {
                    val instance = ServiceInstance(
                        dk.sdu.cloud.storage.api.StorageServiceDescription.definition(),
                        "localhost",
                        42000
                    )
                    installDefaultFeatures(mockk(relaxed = true), mockk(relaxed = true), instance, requireJobId = false)
                    install(JWTProtection)
                    val fsRoot = createDummyFS()
                    val fs = cephFSWithRelaxedMocks(
                        fsRoot.absolutePath,
                        userDao = cloudToCephFsDAOWithFixedAnswer("user")
                    )
                    val ss = ShareService(InMemoryShareDAO(), fs)

                    routing {
                        route("api") {
                            ShareController(ss, fs).configure(this)
                            FilesController(fs).configure(this)
                        }
                    }
                },

                test = {

                    val response = handleRequest(HttpMethod.Put, "/api/shares") {
                        setUser("user1", Role.USER)
                        setBody(
                            """
                            {
                            "sharedWith" : "user2",
                            "path" : "/home/user1/folder/a",
                            "rights" : ["READ", "EXECUTE"]
                            }
                            """.trimIndent()
                        )
                    }.response

                    assertEquals(HttpStatusCode.Forbidden, response.status())


                }
            )
        }
    }

    @Test
    fun createNonexistingPathTest() {
        withAuthMock {
            withTestApplication(
                moduleFunction = {
                    val instance = ServiceInstance(
                        dk.sdu.cloud.storage.api.StorageServiceDescription.definition(),
                        "localhost",
                        42000
                    )
                    installDefaultFeatures(mockk(relaxed = true), mockk(relaxed = true), instance, requireJobId = false)
                    install(JWTProtection)
                    val fsRoot = createDummyFS()
                    val fs = cephFSWithRelaxedMocks(
                        fsRoot.absolutePath,
                        userDao = cloudToCephFsDAOWithFixedAnswer("user")
                    )
                    val ss = ShareService(InMemoryShareDAO(), fs)

                    routing {
                        route("api") {
                            ShareController(ss, fs).configure(this)
                            FilesController(fs).configure(this)
                        }
                    }
                },

                test = {

                    val response = handleRequest(HttpMethod.Put, "/api/shares") {
                        setUser("user", Role.USER)
                        setBody(
                            """
                            {
                            "sharedWith" : "user1",
                            "path" : "/home/user1/folder/notThere/a",
                            "rights" : ["READ", "EXECUTE"]
                            }
                            """.trimIndent()
                        )
                    }.response

                    assertEquals(HttpStatusCode.BadRequest, response.status())
                }
            )
        }
    }


    @Test
    fun createListAndRejectTest() {
        withAuthMock {
            withTestApplication(
                moduleFunction = {
                    val instance = ServiceInstance(
                        dk.sdu.cloud.storage.api.StorageServiceDescription.definition(),
                        "localhost",
                        42000
                    )
                    installDefaultFeatures(mockk(relaxed = true), mockk(relaxed = true), instance, requireJobId = false)
                    install(JWTProtection)
                    val fsRoot = createDummyFS()
                    val fs = cephFSWithRelaxedMocks(
                        fsRoot.absolutePath,
                        userDao = cloudToCephFsDAOWithFixedAnswer("user")
                    )
                    val ss = ShareService(InMemoryShareDAO(), fs)

                    routing {
                        route("api") {
                            ShareController(ss, fs).configure(this)
                            FilesController(fs).configure(this)
                        }
                    }
                },

                test = {

                    val response = handleRequest(HttpMethod.Put, "/api/shares") {
                        setUser("user", Role.USER)
                        setBody(
                            """
                            {
                            "sharedWith" : "user1",
                            "path" : "/home/user1/folder/a",
                            "rights" : ["READ", "EXECUTE"]
                            }
                            """.trimIndent()
                        )
                    }.response

                    val mapper = jacksonObjectMapper()
                    val id = response.content!!.let { mapper.readValue<FindByShareId>(it).id }

                    assertEquals(HttpStatusCode.OK, response.status())

                    val response1 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                        setUser("user", Role.USER)
                    }.response

                    assertEquals(HttpStatusCode.OK, response1.status())
                    val obj = mapper.readTree(response1.content)
                    assertEquals("1", obj["itemsInTotal"].toString())

                    val response2 = handleRequest(HttpMethod.Post, "/api/shares/reject/$id") {
                        setUser("user1", Role.USER)
                    }.response

                    assertEquals(HttpStatusCode.OK, response2.status())

                    val response3 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                        setUser("user1", Role.USER)
                    }.response
                    println(response3.content)

                    assertEquals(HttpStatusCode.OK, response3.status())
                    val obj1 = mapper.readTree(response3.content)
                    assertEquals("0", obj1["itemsInTotal"].toString())

                }
            )
        }
    }

    @Test
    fun createListAndRevokeTest() {
        withAuthMock {
            withTestApplication(
                moduleFunction = {
                    val instance = ServiceInstance(
                        dk.sdu.cloud.storage.api.StorageServiceDescription.definition(),
                        "localhost",
                        42000
                    )
                    installDefaultFeatures(mockk(relaxed = true), mockk(relaxed = true), instance, requireJobId = false)
                    install(JWTProtection)
                    val fsRoot = createDummyFS()
                    val fs = cephFSWithRelaxedMocks(
                        fsRoot.absolutePath,
                        userDao = cloudToCephFsDAOWithFixedAnswer("user")
                    )
                    val ss = ShareService(InMemoryShareDAO(), fs)

                    routing {
                        route("api") {
                            ShareController(ss, fs).configure(this)
                            FilesController(fs).configure(this)
                        }
                    }
                },

                test = {

                    val response = handleRequest(HttpMethod.Put, "/api/shares") {
                        setUser("user", Role.USER)
                        setBody(
                            """
                            {
                            "sharedWith" : "user1",
                            "path" : "/home/user1/folder/a",
                            "rights" : ["READ", "EXECUTE"]
                            }
                            """.trimIndent()
                        )
                    }.response

                    val mapper = jacksonObjectMapper()
                    val id = response.content!!.let { mapper.readValue<FindByShareId>(it).id }

                    assertEquals(HttpStatusCode.OK, response.status())

                    val response1 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                        setUser("user", Role.USER)
                    }.response

                    assertEquals(HttpStatusCode.OK, response1.status())
                    val obj = mapper.readTree(response1.content)
                    assertEquals("1", obj["itemsInTotal"].toString())

                    val response2 = handleRequest(HttpMethod.Post, "/api/shares/revoke/$id") {
                        setUser("user", Role.USER)
                    }.response

                    assertEquals(HttpStatusCode.OK, response2.status())

                    val response3 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                        setUser("user1", Role.USER)
                    }.response

                    println(response3.content)
                    assertEquals(HttpStatusCode.OK, response3.status())
                    val obj1 = mapper.readTree(response3.content)
                    assertEquals("0", obj1["itemsInTotal"].toString())
                }
            )
        }
    }

    @Test
    fun createListAndUpdateTest() {
        withAuthMock {
            withTestApplication(
                moduleFunction = {
                    val instance = ServiceInstance(
                        dk.sdu.cloud.storage.api.StorageServiceDescription.definition(),
                        "localhost",
                        42000
                    )
                    installDefaultFeatures(mockk(relaxed = true), mockk(relaxed = true), instance, requireJobId = false)
                    install(JWTProtection)
                    val fsRoot = createDummyFS()
                    val fs = cephFSWithRelaxedMocks(
                        fsRoot.absolutePath,
                        userDao = cloudToCephFsDAOWithFixedAnswer("user")
                    )
                    val ss = ShareService(InMemoryShareDAO(), fs)

                    routing {
                        route("api") {
                            ShareController(ss, fs).configure(this)
                            FilesController(fs).configure(this)
                        }
                    }
                },

                test = {

                    val response = handleRequest(HttpMethod.Put, "/api/shares") {
                        setUser("user", Role.USER)
                        setBody(
                            """
                            {
                            "sharedWith" : "user1",
                            "path" : "/home/user1/folder/a",
                            "rights" : ["READ", "EXECUTE"]
                            }
                            """.trimIndent()
                        )
                    }.response

                    val mapper = jacksonObjectMapper()
                    val id = response.content!!.let { mapper.readValue<FindByShareId>(it).id }

                    assertEquals(HttpStatusCode.OK, response.status())

                    val response1 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                        setUser("user", Role.USER)
                    }.response

                    assertEquals(HttpStatusCode.OK, response1.status())

                    val obj = mapper.readValue<Page<SharesByPath>>(response1.content!!)
                    val share = obj.items.first().shares.find { it.id == id }
                    assert(
                        share?.rights.toString().contains("READ") && share?.rights.toString().contains("EXECUTE") && !(share?.rights.toString().contains(
                            "WRITE"
                        ))
                    )


                    val response2 = handleRequest(HttpMethod.Post, "/api/shares/") {
                        setUser("user", Role.USER)
                        setBody(
                            """
                            {
                            "id" : "$id",
                            "rights" : ["WRITE"]
                            }
                            """.trimIndent()
                        )
                    }.response

                    assertEquals(HttpStatusCode.OK, response2.status())

                    val response3 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                        setUser("user", Role.USER)
                    }.response

                    assertEquals(HttpStatusCode.OK, response3.status())
                    val obj1 = mapper.readValue<Page<SharesByPath>>(response3.content!!)
                    val share1 = obj1.items.first().shares.find { it.id == id }
                    assertEquals("[WRITE]", share1?.rights.toString())
                }
            )
        }
    }

    @Test
    fun createListAndUpdateNotOwnFileTest() {
        withAuthMock {
            withTestApplication(
                moduleFunction = {
                    val instance = ServiceInstance(
                        dk.sdu.cloud.storage.api.StorageServiceDescription.definition(),
                        "localhost",
                        42000
                    )
                    installDefaultFeatures(mockk(relaxed = true), mockk(relaxed = true), instance, requireJobId = false)
                    install(JWTProtection)
                    val fsRoot = createDummyFS()
                    val fs = cephFSWithRelaxedMocks(
                        fsRoot.absolutePath,
                        userDao = cloudToCephFsDAOWithFixedAnswer("user")
                    )
                    val ss = ShareService(InMemoryShareDAO(), fs)

                    routing {
                        route("api") {
                            ShareController(ss, fs).configure(this)
                            FilesController(fs).configure(this)
                        }
                    }
                },

                test = {

                    val response = handleRequest(HttpMethod.Put, "/api/shares") {
                        setUser("user", Role.USER)
                        setBody(
                            """
                            {
                            "sharedWith" : "user1",
                            "path" : "/home/user1/folder/a",
                            "rights" : ["READ", "EXECUTE"]
                            }
                            """.trimIndent()
                        )
                    }.response

                    val mapper = jacksonObjectMapper()
                    val id = response.content!!.let { mapper.readValue<FindByShareId>(it).id }

                    assertEquals(HttpStatusCode.OK, response.status())

                    val response1 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                        setUser("user", Role.USER)
                    }.response

                    assertEquals(HttpStatusCode.OK, response1.status())

                    val obj = mapper.readValue<Page<SharesByPath>>(response1.content!!)
                    val share = obj.items.first().shares.find { it.id == id }
                    assert(
                        share?.rights.toString().contains("READ") && share?.rights.toString().contains("EXECUTE") && !(share?.rights.toString().contains(
                            "WRITE"
                        ))
                    )

                    val response2 = handleRequest(HttpMethod.Post, "/api/shares/") {
                        setUser("user1", Role.USER)
                        setBody(
                            """
                            {
                            "id" : "$id",
                            "rights" : ["WRITE"]
                            }
                            """.trimIndent()
                        )
                    }.response

                    assertEquals(HttpStatusCode.Forbidden, response2.status())

                    val response3 = handleRequest(HttpMethod.Get, "/api/shares?itemsPerPage=10&page=0") {
                        setUser("user1", Role.USER)
                    }.response

                    assertEquals(HttpStatusCode.OK, response3.status())
                    val obj1 = mapper.readValue<Page<SharesByPath>>(response3.content!!)
                    val share1 = obj1.items.first().shares.find { it.id == id }
                    assert(
                        share1?.rights.toString().contains("READ") && share1?.rights.toString().contains("EXECUTE") && !(share1?.rights.toString().contains(
                            "WRITE"
                        ))
                    )
                }
            )
        }
    }
    */
}
