package dk.sdu.cloud.auth.services

import dk.sdu.cloud.auth.api.Person
import dk.sdu.cloud.auth.api.Principal
import dk.sdu.cloud.service.NormalizedPaginationRequest
import dk.sdu.cloud.service.Page
import dk.sdu.cloud.service.PaginationRequest

data class HashedPasswordAndSalt(val hashedPassword: ByteArray, val salt: ByteArray)

interface UserDAO<Session> {
    fun findById(session: Session, id: String): Principal
    fun findByIdOrNull(session: Session, id: String): Principal?
    fun findAllByIds(session: Session, ids: List<String>): Map<String, Principal?>
    fun findByUsernamePrefix(session: Session, prefix: String): List<Principal>
    fun findByWayfId(session: Session, wayfId: String): Person.ByWAYF
    fun insert(session: Session, principal: Principal)
    fun updatePassword(
        session: Session,
        id: String,
        newPassword: String,
        currentPasswordForVerification: String?
    )

    fun delete(session: Session, id: String)

    fun listAll(session: Session): List<Principal>
}

