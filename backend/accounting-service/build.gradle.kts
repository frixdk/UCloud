version = "1.4.3"

application {
    mainClassName = "dk.sdu.cloud.accounting.MainKt"
}

dependencies {
    implementation(project(":auth-service:api"))
    implementation(project(":project-service:api"))
    implementation(project(":mail-service:api"))
}
