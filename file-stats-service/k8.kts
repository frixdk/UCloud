//DEPS dk.sdu.cloud:k8-resources:0.1.0
package dk.sdu.cloud.k8

bundle {
    name = "file-stats"
    version = "1.2.9"

    withAmbassador("/api/files/stats") {}

    val deployment = withDeployment {
        deployment.spec.replicas = 2
    }
}
