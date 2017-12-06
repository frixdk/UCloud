package escienceclouddb.payloadmodels

enum class PublicationUiCommand {
    create, update, delete, setActive, setInActive, getById, getAllList, getAllActiveList, getAllInActiveList, getByName
}

data class Publication_payload(val session: String,
                               val jwt: String,
                               val command: PublicationUiCommand,
                               val id: Int = 0,
                               val publicationextlink: String,
                               val publicationtitle: String,
                               val publicationdate: Long=0
)
{

    init {
        if (command.equals(AppUiCommand.create)) {

            if (id!=0) {
                throw IllegalArgumentException("common:publication:create:messagetext: id must be empty ")
            }

            if (publicationextlink.isEmpty()) {
                throw IllegalArgumentException("common:publication:create:messagetext: publicationextlink can not be empty ")
            }

            if (publicationtitle.isEmpty()) {
                throw IllegalArgumentException("common:publication:create:messagetext: publicationtitle can not be empty ")
            }

            if (publicationdate==null||publicationdate<1) {
                throw IllegalArgumentException("common:publication:create:messagetext: publicationdate can not be empty ")
            }
        }

        if (command.equals("update")) {
            if (id != 0 || id == null) {
                throw IllegalArgumentException("common:publication:update:messagetext: id can not be empty or 0 ")
            }

            if (publicationextlink.isEmpty()) {
                throw IllegalArgumentException("common:publication:update:messagetext: publicationextlink can not be empty ")
            }

            if (publicationtitle.isEmpty()) {
                throw IllegalArgumentException("common:publication:update:messagetext: publicationtitle can not be empty ")
            }

            if (publicationdate==null||publicationdate<1) {
                throw IllegalArgumentException("common:publication:update:messagetext: publicationdate can not be empty ")
            }
        }

        if (command.equals("delete")) {
            if (id != 0 || id == null)

                throw IllegalArgumentException("common:app:delete:messagetext: id can not be empty")
        }

        if (command.equals("setActive")) {
            if (id != 0 || id == null)

                throw IllegalArgumentException("common:app:setActive:messagetext: id can not be empty")
        }

        if (command.equals("setInActive")) {
            if (id != 0 || id == null)

                throw IllegalArgumentException("common:app:setInActive: message id can not be empty")
        }

        if (command.equals("getById")) {
            if (id != 0 || id == null)

                throw IllegalArgumentException("common:app:getById:messagetext: id can not be empty")
        }


        if (command.equals("getByName")) {
            if (publicationtitle.isEmpty()) {
                throw IllegalArgumentException("common:publication:getByName:messagetext: publicationtitle can not be empty ")
            }
        }


    }
}