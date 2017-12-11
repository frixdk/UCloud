package escienceclouddb

import org.jetbrains.exposed.dao.EntityID
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.IntIdTable

object Systemrole : IntIdTable() {
    val created_ts = datetime("created_ts")
    val modified_ts = datetime("modified_ts")
    val systemroletext = text("systemroletext").nullable()
    val landingpage = text("landingpage").nullable()
    val active = integer("active").nullable()
}
class SystemroleEntity(id: EntityID<Int>) : IntEntity(id) {
    companion object: IntEntityClass<SystemroleEntity>(Systemrole)

    var created_ts by Systemrole.created_ts
    var modified_ts by Systemrole.modified_ts
    var systemroletext by Systemrole.systemroletext
    var landingpage by Systemrole.landingpage
    var active by Systemrole.active
}