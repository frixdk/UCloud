package escienceclouddb.payloadmodels

enum class ProjectprojectresearchtyperelUiCommand {
    create, update, delete, setActive, setInActive, getById, getAllList, getAllActiveList, getAllInActiveList
}

data class Projectprojectresearchtyperel_payload(val session: String,
                                                 val command: ProjectprojectresearchtyperelUiCommand,
                                                 val id: Int = 0,
                                                 val projectrefid: Int,
                                                 val projectresearchtyperefid: Int
)
{

    init {
        if (command.equals(AppUiCommand.create)) {

            if (id!=0) {
                throw IllegalArgumentException("common:projectprojectresearchtyperel:create:messagetext: id must be empty ")
            }

            if (projectrefid==0||projectrefid==null) {
                throw IllegalArgumentException("common:projectprojectresearchtyperel:create:messagetext: projectrefid must not be  empty or 0 ")
            }

            if (projectresearchtyperefid==0||projectresearchtyperefid==null) {
                throw IllegalArgumentException("common:projectprojectresearchtyperel:create:messagetext: personrefid must not be  empty or 0 ")
            }

        }

        if (command.equals("update")) {
            if (id==0||id==null) {
                throw IllegalArgumentException("common:projectprojectresearchtyperel:update:messagetext: appdescriptiontext can not be empty ")
            }

            if (projectrefid==0||projectrefid==null) {
                throw IllegalArgumentException("common:projectprojectresearchtyperel:update:messagetext: projectrefid must not be  empty or 0 ")
            }

            if (projectresearchtyperefid==0||projectresearchtyperefid==null) {
                throw IllegalArgumentException("common:projectprojectresearchtyperel:update:messagetext: personrefid must not be  empty or 0 ")
            }
        }

        if (command.equals("delete")) {
            if (id==0||id==null)

                throw IllegalArgumentException("common:projectprojectresearchtyperel:delete:messagetext: id can not be empty or 0")
        }

        if (command.equals("setActive")) {
            if (id==0||id==null)

                throw IllegalArgumentException("common:projectprojectresearchtyperel:setActive:messagetext: id can not be empty or 0")
        }

        if (command.equals("setInActive")) {
            if (id==0||id==null)

                throw IllegalArgumentException("common:projectprojectresearchtyperel:setInActive: message id can not be empty or 0")
        }

        if (command.equals("getById")) {
            if (id==0||id==null)

                throw IllegalArgumentException("common:app:getById:messagetext: id can not be empty or 0")
        }





    }
}