//DEPS dk.sdu.cloud:k8-resources:0.1.0
package dk.sdu.cloud.k8

bundle {
    name = "filesearch"
    version = "1.5.2"

    withAmbassador("/api/file-search") {}

    val deployment = withDeployment {
        deployment.spec.replicas = 2
    }
}
