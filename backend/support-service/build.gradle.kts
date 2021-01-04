version = "1.4.6"

application {
    mainClassName = "dk.sdu.cloud.support.MainKt"
}

dependencies {
    implementation(project(":auth-service:api"))
    implementation(project(":slack-service:api"))
    implementation(project(":mail-service:api"))

}
