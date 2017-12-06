package escienceclouddb.payloadmodels

enum class PersonappusermessagesubscriptiontyperelUiCommand {
    create, update, delete, setActive, setInActive, getById, getAllList, getAllActiveList, getAllInActiveList
}

data class Personappusermessagesubscriptiontyperel_payload(
        val session: String,
        val jwt: String,
        val command: PersonappusermessagesubscriptiontyperelUiCommand,
        val id: Int,
        val appusermessagesubscriptiontyperefid: Int=0,
        val personrefid: Int=0
)
{

    init {
        if (command.equals(AppUiCommand.create)) {

            if (id!=0) {
                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:create:messagetext: id must be empty ")
            }

            if (appusermessagesubscriptiontyperefid==0||appusermessagesubscriptiontyperefid==null) {
                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:create:messagetext: appusermessagesubscriptiontyperefid can not be 0 or null ")
            }

            if (personrefid==0||personrefid==null) {
                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:create:messagetext: personrefid can not be 0 or null")
            }
        }

        if (command.equals("update")) {
            if (id==0||id==null) {
                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:update:messagetext: appdescriptiontext can not be empty ")
            }

            if (appusermessagesubscriptiontyperefid==0) {
                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:create:messagetext: appusermessagesubscriptiontyperefid can not be 0 or null ")
            }

            if (personrefid==0||personrefid==null) {
                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:create:messagetext: personrefid can not be 0 or null ")
            }
        }

        if (command.equals("delete")) {
            if (id==0||id==null)

                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:delete:messagetext: id can not be 0 or null")
        }

        if (command.equals("setActive")) {
            if (id==0||id==null)

                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:setActive:messagetext: id can not be 0 or null")
        }

        if (command.equals("setInActive")) {
            if (id==0||id==null)

                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:setInActive: message id can not be 0 or null")
        }

        if (command.equals("getById")) {
            if (id==0||id==null)

                throw IllegalArgumentException("common:personappusermessagesubscriptiontyperel:getById:messagetext: id can not be 0 or null")
        }




    }
}