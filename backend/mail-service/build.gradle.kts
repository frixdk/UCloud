version = "0.2.2"

application {
    mainClassName = "dk.sdu.cloud.mail.MainKt"
}

dependencies {
    implementation(project(":auth-service:api"))
    implementation("com.sun.mail:javax.mail:1.5.5")
}
