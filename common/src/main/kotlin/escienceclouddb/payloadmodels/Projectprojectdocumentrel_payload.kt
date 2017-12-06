package escienceclouddb.payloadmodels

enum class ProjectprojectdocumentrelUiCommand {
    create, update, delete, setActive, setInActive, getById, getAllList, getAllActiveList, getAllInActiveList, getByName
}

data class Projectprojectdocumentrel_payload(val session: String,
                                             val jwt: String,
                                             val command: ProjectprojectdocumentrelUiCommand,
                                             val id: Int = 0,
                                             val projectrefid: Int,
                                             val projectdocumentrefid: Int
)
{

    init {
        if (command.equals(AppUiCommand.create)) {

            if (id!=0) {
                throw IllegalArgumentException("common:app:create:messagetext: id must be empty ")
            }

            if (projectrefid!=0||projectrefid==null) {
                throw IllegalArgumentException("common:projectpersonrel:create:messagetext: projectrefid must not be  empty or 0 ")
            }

            if (projectdocumentrefid!=0||projectdocumentrefid==null) {
                throw IllegalArgumentException("common:projectpersonrel:create:messagetext: projectdocumentrefid must not be  empty or 0 ")
            }
        }

        if (command.equals("update")) {
            if (id==null)

                throw IllegalArgumentException("common:app:update:messagetext: appdescriptiontext can not be empty ")
        }

        if (command.equals("delete")) {
            if (id==null)

                throw IllegalArgumentException("common:app:delete:messagetext: id can not be empty")
        }

        if (command.equals("setActive")) {
            if (id==null)

                throw IllegalArgumentException("common:app:setActive:messagetext: id can not be empty")
        }

        if (command.equals("setInActive")) {
            if (id==null)

                throw IllegalArgumentException("common:app:setInActive: message id can not be empty")
        }

        if (command.equals("getById")) {
            if (id==null)

                throw IllegalArgumentException("common:app:getById:messagetext: id can not be empty")
        }


        if (command.equals("getByName")) {
            if (id==null)

                throw IllegalArgumentException("common:app:getByName:messagetext: id can not be empty")
        }


    }
}