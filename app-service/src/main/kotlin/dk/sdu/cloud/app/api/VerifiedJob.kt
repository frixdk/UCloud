package dk.sdu.cloud.app.api

data class VerifiedJob(
    val application: Application,
    val files: List<ValidatedFileForUpload>,
    val id: String,
    val owner: String,
    val nodes: Int,
    val tasksPerNode: Int,
    val maxTime: SimpleDuration,
    val jobInput: VerifiedJobInput,
    val backend: String,
    val currentState: JobState,
    val status: String,
    val archiveInCollection: String,
    val ownerUid: Long,
    val workspace: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val modifiedAt: Long = System.currentTimeMillis()
) {
    override fun toString() = "VerifiedJob(${application.metadata.name}@${application.metadata.version})"
}
