import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import org.jetbrains.kotlin.gradle.dsl.KotlinMultiplatformExtension
import org.jetbrains.kotlin.gradle.utils.addExtendsFromRelation

repositories {
    mavenCentral()
}

buildscript {
    repositories {
        jcenter()
        mavenCentral()
        maven { setUrl("https://plugins.gradle.org/m2/") }
    }

    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.4.30")
        classpath("org.jetbrains.kotlin:kotlin-serialization:1.4.30")
    }
}

// https://guides.gradle.org/creating-multi-project-builds/
// https://docs.gradle.org/current/userguide/multi_project_builds.html
subprojects {
    val groupBuilder = ArrayList<String>()
    var currentProject: Project? = project
    while (currentProject != null && currentProject != rootProject) {
        groupBuilder.add(currentProject.name)
        currentProject = currentProject.parent
    }
    if (groupBuilder.isEmpty()) {
        group = "dk.sdu.cloud"
    } else {
        group = "dk.sdu.cloud." + groupBuilder.reversed().joinToString(".")
    }

    val isApi = project.name == "api"
    val isService = project.name.endsWith("-service")
    val isLauncher = project.name == "launcher"
    val isServiceLib = project.name == "service-lib" || project.name == "service-lib-test"

    repositories {
        jcenter()
        mavenCentral()
    }

    if (isService) {
        apply(plugin = "org.jetbrains.kotlin.multiplatform")
        apply(plugin = "org.jetbrains.kotlin.plugin.serialization")
        apply(plugin = "application")

        extensions.configure<KotlinMultiplatformExtension>("kotlin") {
            jvm {
                withJava()

                val main by compilations.getting {
                    kotlinOptions {
                        jvmTarget = "11"
                    }
                }

                val test by compilations.getting {
                    kotlinOptions {
                        jvmTarget = "11"
                    }
                }
            }

            sourceSets {
                val generated by creating {
                    dependencies {
                        implementation(project(":service-lib"))
                    }
                }

                val jvmMain by getting {
                    dependencies {
                        dependsOn(generated)

                        val myApiProject = project.childProjects["api"]
                        if (myApiProject != null) {
                            implementation(myApiProject)
                        }
                    }
                }
            }
        }

        val generateBuildConfig by tasks.creating {
            doFirst {
                if (project.version == "unspecified") {
                    throw IllegalStateException("Version not set for service: ${project.name} (${project.version})")
                }

                run {
                    val src = File(project.projectDir, "src/generated/kotlin")
                    src.mkdirs()
                    val simpleName = project.name.replace("-service", "")
                    val packageName = simpleName.replace("-", ".")
                    val className = simpleName.split("-").joinToString("") { it.capitalize() }

                    File(src, "Description.kt").writeText(
                        """
                        package dk.sdu.cloud.$packageName.api
                        
                        import dk.sdu.cloud.ServiceDescription
                        
                        object ${className}ServiceDescription : ServiceDescription {
                            override val name = "$simpleName"
                            override val version = "${project.version}"
                        }
                    """.trimIndent()
                    )
                }

                run {
                    val src = File(project.projectDir, "src/generated/resources")
                    src.mkdirs()

                    File(src, "name.txt").writeText(project.name)
                    File(src, "version.txt").writeText(project.version.toString())
                }
            }
        }

        tasks.withType<KotlinCompile>().configureEach {
            kotlinOptions.freeCompilerArgs += "-progressive"
            kotlinOptions.freeCompilerArgs += "-Xopt-in=kotlin.RequiresOptIn"
        }
    }

    if (isApi) {
        apply(plugin = "org.jetbrains.kotlin.multiplatform")
        apply(plugin = "org.jetbrains.kotlin.plugin.serialization")

        extensions.configure<KotlinMultiplatformExtension>("kotlin") {
            jvm {
                withJava()

                val main by compilations.getting {
                    kotlinOptions {
                        jvmTarget = "11"
                    }
                }

                val test by compilations.getting {
                    kotlinOptions {
                        jvmTarget = "11"
                    }
                }
            }

            sourceSets {
                val commonMain by getting {
                    dependencies {
                        implementation(project(":service-lib"))
                    }
                }

                val jvmMain by getting {
                    dependencies {
                        implementation(project(":service-lib"))
                    }
                }

                val jvmTest by getting {
                    dependencies {
                        implementation(project(":service-lib-test"))
                    }
                }
            }
        }
    }

    /*
    apply(plugin = "java")
    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "jacoco")

    if (project.name == "launcher") {
        apply(plugin = "application")
    }

    if (project.name.endsWith("-service")) {
        run {
            val generated = sourceSets.create("generated")

            dependencies {
                implementation(generated.output)
                add("generatedImplementation", project(":service-common"))
            }

            val generateBuildConfig = tasks.register("generateBuildConfig") {
                doFirst {
                    if (project.version == "unspecified") {
                        throw IllegalStateException("Version not set for service: ${project.name} (${project.version})")
                    }

                    run {
                        val src = File(project.projectDir, "src/generated/kotlin")
                        src.mkdirs()
                        val simpleName = project.name.replace("-service", "")
                        val packageName = simpleName.replace("-", ".")
                        val className = simpleName.split("-").joinToString("") { it.capitalize() }

                        File(src, "Description.kt").writeText(
                            """
                            package dk.sdu.cloud.$packageName.api
                            
                            import dk.sdu.cloud.ServiceDescription
                            
                            object ${className}ServiceDescription : ServiceDescription {
                                override val name = "$simpleName"
                                override val version = "${project.version}"
                            }
                        """.trimIndent()
                        )
                    }

                    run {
                        val src = File(project.projectDir, "src/generated/resources")
                        src.mkdirs()

                        File(src, "name.txt").writeText(project.name)
                        File(src, "version.txt").writeText(project.version.toString())
                    }
                }
            }
        }
    }

    /*
    tasks.withType<Jar> {
        val name = if (groupBuilder.isEmpty()) {
            "ucloud"
        } else {
            "ucloud-" + groupBuilder.reversed().joinToString("-")
        }

        archiveName = "$name.jar"

        if (project.name.endsWith("-service")) {
            from(sourceSets["generated"].output)
        }
    }
     */

    dependencies {
        implementation("org.jetbrains.kotlin:kotlin-reflect:1.4.30")
    }

    tasks {
        jacoco {
            toolVersion = "0.8.4"
        }

        jacocoTestReport {
            reports {
                xml.isEnabled = true
                html.isEnabled = true
            }
        }

        val test by getting(Task::class)
        test.finalizedBy(jacocoTestReport)
    }

    dependencies {
        //implementation(kotlin("stdlib-jdk11"))

        val myApiProject = project.childProjects["api"]
        if (myApiProject != null) {
            implementation(myApiProject)
        }

        if (project.name.endsWith("-service") || project.name == "integration-testing") {
            apply(plugin = "application")
        }

        if (project.name.endsWith("-service") || project.name == "api") {
            implementation(project(":service-common"))
            testImplementation(project(":service-common-test"))
        }
    }

    /*
    tasks.withType<KotlinCompile>().configureEach {
        kotlinOptions.freeCompilerArgs += "-progressive"
        kotlinOptions.freeCompilerArgs += "-Xopt-in=kotlin.RequiresOptIn"
    }

    tasks.withType<org.gradle.api.tasks.JavaExec>().configureEach {
        systemProperty("log4j2.configurationFactory", "dk.sdu.cloud.micro.Log4j2ConfigFactory")
    }

    tasks.withType<Test>().configureEach {
        systemProperty("log4j2.configurationFactory", "dk.sdu.cloud.micro.Log4j2ConfigFactory")
        systemProperty("java.io.tmpdir", System.getProperty("java.io.tmpdir"))
    }

    tasks.test {
        filter {
            isFailOnNoMatchingTests = false
            excludeTestsMatching("dk.sdu.cloud.integration.*")
        }
    }

    task<Test>("integrationTest") {
        description = "Runs integration test"
        group = "verification"

        filter {
            isFailOnNoMatchingTests = false
            includeTestsMatching("dk.sdu.cloud.integration.backend.*")
        }
    }

    task<Test>("e2eTest") {
        description = "Runs E2E tests"
        group = "verification"

        filter {
            isFailOnNoMatchingTests = false
            includeTestsMatching("dk.sdu.cloud.integration.backend.e2e.*")
        }
    }

    val compileKotlin: KotlinCompile by tasks
    compileKotlin.kotlinOptions {
        jvmTarget = "11"
    }
    val compileTestKotlin: KotlinCompile by tasks
    compileTestKotlin.kotlinOptions {
        jvmTarget = "11"
    }
     */
     */
}