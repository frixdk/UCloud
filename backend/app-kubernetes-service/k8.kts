package dk.sdu.cloud.k8

bundle { ctx ->
    name = "app-kubernetes"
    version = "0.21.23"

    val additionalConfig = config("additionalConfig", "Additional configuration (YAML)", "")
    val prefix: String = config("prefix", "Application name prefix (e.g. 'app-')", "app-")
    val domain: String = config("domain", "Application domain (e.g. 'cloud.sdu.dk')")
    val useMachineSelector: Boolean = config(
        "useMachineSelector",
        "Should the machine selector: ucloud.dk/machine=\$type be used?",
        false
    )
    val networkInterface: String = config("networkInterface", "Network interface for public IPs")
    val networkGatewayCidr: String = config("networkGatewayCidr", "Network interface for public IPs", "null")
    val internalEgressWhiteList: List<String> = config(
        "internalEgressWhitelist",
        "Internal sites to whitelist",
        emptyList()
    )

    withAmbassador(pathPrefix = null) {
        addSimpleMapping("/api/app/compute/kubernetes")
        addSimpleMapping("/ucloud/ucloud")
    }

    val deployment = withDeployment {
        deployment.spec.replicas = 2

        run {
            // Envoy configuration
            val envoySharedVolume = "envoy"
            volumes.add(Volume().apply {
                name = envoySharedVolume
                emptyDir = EmptyDirVolumeSource()
            })

            containers.add(Container().apply {
                name = "envoy"
                image = "envoyproxy/envoy:v1.11.1"
                command = listOf(
                    "sh", "-c",
                    """
                        while [ ! -f /mnt/shared/envoy/config.yaml ]; do sleep 0.5; done;
                        envoy -c /mnt/shared/envoy/config.yaml
                    """.trimIndent()
                )

                val workingDirectory = "/mnt/shared/envoy"
                workingDir = workingDirectory
                volumeMounts.add(VolumeMount().apply {
                    name = envoySharedVolume
                    mountPath = workingDirectory
                })
            })

            serviceContainer.workingDir = "/mnt/shared"
            serviceContainer.volumeMounts.add(VolumeMount().apply {
                mountPath = "/mnt/shared/envoy"
                name = envoySharedVolume
            })
        }

        // Service account is needed for this service to schedule user jobs
        deployment.spec.template.spec.serviceAccountName = this@bundle.name

        injectConfiguration("app-kubernetes")
        injectConfiguration("ceph-fs-config")
        injectSecret("ucloud-provider-tokens")
    }

    withPostgresMigration(deployment)

    withNetworkPolicy("app-policy", version = "5") {
        policy.metadata.namespace = "app-kubernetes"

        policy.spec = NetworkPolicySpec().apply {
            podSelector = LabelSelector().apply {
                matchExpressions = listOf(LabelSelectorRequirement("volcano.sh/job-name", "Exists", null))
            }

            ingress = emptyList()
            egress = listOf(
                allowPortEgress(
                    listOf(
                        PortAndProtocol(53, NetworkProtocol.TCP),
                        PortAndProtocol(53, NetworkProtocol.UDP)
                    )
                ),

                allowEgressTo(
                    listOf(
                        EgressToPolicy(
                            "0.0.0.0/0",
                            listOf(
                                "10.0.0.0/8",
                                "172.16.0.0/12",
                                "192.168.0.0/16",
                                // smtp.sdu.dk
                                "130.225.156.18/32",
                                "130.225.156.19/32"
                            )
                        )
                    )
                ),

                allowEgressToPods("volcano.sh/job-name", "Exists")
            ) + internalEgressWhiteList.map {
                allowEgressTo(listOf(EgressToPolicy(it)))
            }
        }
    }

    withNetworkPolicy("app-allow-proxy", version = "4") {
        policy.metadata.namespace = "app-kubernetes"

        policy.spec = NetworkPolicySpec().apply {
            podSelector = LabelSelector().apply {
                matchExpressions = listOf(LabelSelectorRequirement("volcano.sh/job-name", "Exists", null))
            }

            ingress = listOf(
                allowFromPods(mapOf("app" to "app-kubernetes"), null)
            )
        }
    }

    withClusterServiceAccount {
        addRule(
            apiGroups = listOf(""),
            resources = listOf("pods", "pods/log", "pods/portforward", "pods/exec", "services", "events"),
            verbs = listOf("*")
        )

        addRule(
            apiGroups = listOf(""),
            resources = listOf("nodes", "namespaces"),
            verbs = listOf("list", "get")
        )

        addRule(
            apiGroups = listOf("batch", "extensions"),
            resources = listOf("jobs", "networkpolicies"),
            verbs = listOf("*")
        )

        addRule(
            apiGroups = listOf("networking.k8s.io"),
            resources = listOf("networkpolicies"),
            verbs = listOf("*")
        )

        addRule(
            apiGroups = listOf("batch.volcano.sh"),
            resources = listOf("jobs"),
            verbs = listOf("*")
        )
    }

    withConfigMap {
        addConfig(
            "config.yaml",

            //language=yaml
            """
                app:
                  kubernetes:
                    performAuthentication: true
                    prefix: "$prefix"
                    domain: $domain
                    networkInterface: $networkInterface
                    networkGatewayCidr: $networkGatewayCidr
                    useMachineSelector: $useMachineSelector
                    toleration:
                      key: sducloud
                      value: apps

            """.trimIndent()
        )

        addConfig("additional.yaml", additionalConfig)
    }

    withIngress("apps") {
        resource.metadata.annotations = resource.metadata.annotations +
            mapOf("nginx.ingress.kubernetes.io/proxy-body-size" to "0")
        addRule("*.$domain", service = "app-kubernetes", port = 80)
    }

    resources.add(
        object : KubernetesResource {
            override val phase = DeploymentPhase.DEPLOY
            override fun toString() = "Volcano Deployment"
            val cm = ConfigMapResource("volcano-deploy-version", "1")
            val registry = "dreg.cloud.sdu.dk/"
            val version = "1.0.1-ucloud.1"

            val yamlResources = """
                ---
                # Source: volcano/templates/admission.yaml
                apiVersion: v1
                kind: ServiceAccount
                metadata:
                  name: volcano-admission
                  namespace: volcano-system
                ---
                # Source: volcano/templates/controllers.yaml
                apiVersion: v1
                kind: ServiceAccount
                metadata:
                  name: volcano-controllers
                  namespace: volcano-system
                ---
                # Source: volcano/templates/scheduler.yaml
                apiVersion: v1
                kind: ServiceAccount
                metadata:
                  name: volcano-scheduler
                  namespace: volcano-system
                ---
                # Source: volcano/templates/scheduler.yaml
                apiVersion: v1
                kind: ConfigMap
                metadata:
                  name: volcano-scheduler-configmap
                  namespace: volcano-system
                data:
                  volcano-scheduler.conf: |
                    actions: "enqueue, allocate, backfill"
                    tiers:
                    - plugins:
                      - name: priority
                      - name: gang
                      - name: conformance
                    - plugins:
                      - name: drf
                      - name: predicates
                      - name: proportion
                      - name: nodeorder
                      - name: binpack
                ---
                # Source: volcano/templates/batch_v1alpha1_job.yaml
                apiVersion: apiextensions.k8s.io/v1beta1
                kind: CustomResourceDefinition
                metadata:
                  name: jobs.batch.volcano.sh
                spec:
                  group: batch.volcano.sh
                  names:
                    kind: Job
                    plural: jobs
                    shortNames:
                      - vcjob
                      - vj
                  scope: Namespaced
                  validation:
                    openAPIV3Schema:
                      type: object
                      properties:
                        apiVersion:
                          description: 'APIVersion defines the versioned schema of this representation
                            of an object. Servers should convert recognized schemas to the latest
                            internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#resources'
                          type: string
                        kind:
                          description: 'Kind is a string value representing the REST resource this
                            object represents. Servers may infer this from the endpoint the client
                            submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#types-kinds'
                          type: string
                        metadata:
                          type: object
                        spec:
                          description: Specification of the desired behavior of a cron job, including
                            the minAvailable
                          properties:
                            volumes:
                              description: The volumes for Job
                              items:
                                properties:
                                  volumeClaim:
                                    description: VolumeClaim defines the PVC used by the VolumeMount.
                                    type: object
                                  mountPath:
                                    description: Path within the container at which the volume should be mounted.
                                      Must not contain ':'.
                                    type: string
                                  volumeClaimName:
                                    description: The name of the volume claim.
                                    type: string
                                type: object
                                required:
                                  - mountPath
                              type: array
                            minAvailable:
                              description: The minimal available pods to run for this Job
                              format: int32
                              type: integer
                            policies:
                              description: Specifies the default lifecycle of tasks
                              items:
                                properties:
                                  action:
                                    description: The action that will be taken to the PodGroup according
                                      to Event. One of "Restart", "None". Default to None.
                                    type: string
                                  event:
                                    description: The Event recorded by scheduler; the controller takes
                                      actions according to this Event.
                                    type: string
                                  events:
                                    description: The Events recorded by scheduler; the controller takes
                                      actions according to this Events.
                                    type: array
                                    items:
                                      type: string
                                  timeout:
                                    description: Timeout is the grace period for controller to take
                                      actions. Default to nil (take action immediately).
                                    type: object
                                type: object
                              type: array
                            schedulerName:
                              description: SchedulerName is the default value of `tasks.template.spec.schedulerName`.
                              type: string
                            plugins:
                              description: Enabled task plugins when creating job.
                              type: object
                            tasks:
                              description: Tasks specifies the task specification of Job
                              items:
                                properties:
                                  name:
                                    description: Name specifies the name of tasks
                                    type: string
                                  policies:
                                    description: Specifies the lifecycle of task
                                    items:
                                      properties:
                                        action:
                                          description: The action that will be taken to the PodGroup
                                            according to Event. One of "Restart", "None". Default
                                            to None.
                                          type: string
                                        event:
                                          description: The Event recorded by scheduler; the controller
                                            takes actions according to this Event.
                                          type: string
                                        events:
                                          description: The Events recorded by scheduler; the controller takes
                                            actions according to this Events.
                                          type: array
                                          items:
                                            type: string
                                        timeout:
                                          description: Timeout is the grace period for controller
                                            to take actions. Default to nil (take action immediately).
                                          type: object
                                      type: object
                                    type: array
                                  replicas:
                                    description: Replicas specifies the replicas of this TaskSpec
                                      in Job
                                    format: int32
                                    type: integer
                                  template:
                                    description: Specifies the pod that will be created for this TaskSpec
                                      when executing a Job
                                    type: object
                                type: object
                              type: array
                            queue:
                              description: The name of the queue on which job should been created
                              type: string
                            maxRetry:
                              description: The limit for retrying submiting job, default is 3
                              format: int32
                              type: integer
                          type: object
                        status:
                          description: Current status of Job
                          properties:
                            succeeded:
                              description: The number of pods which reached phase Succeeded.
                              format: int32
                              type: integer
                            failed:
                              description: The number of pods which reached phase Failed.
                              format: int32
                              type: integer
                            minAvailable:
                              description: The minimal available pods to run for this Job
                              format: int32
                              type: integer
                            pending:
                              description: The number of pending pods.
                              format: int32
                              type: integer
                            running:
                              description: The number of running pods.
                              format: int32
                              type: integer
                            version:
                              description: Job's current version
                              format: int32
                              type: integer
                            retryCount:
                              description: The number that volcano retried to submit the job.
                              format: int32
                              type: integer
                            controlledResources:
                              description: All of the resources that are controlled by this job.
                              type: object
                              additionalProperties:
                                type: string
                            state:
                              description: Current state of Job.
                              properties:
                                message:
                                  description: Human-readable message indicating details about last
                                    transition.
                                  type: string
                                phase:
                                  description: The phase of Job
                                  type: string
                                reason:
                                  description: Unique, one-word, CamelCase reason for the condition's
                                    last transition.
                                  type: string
                                lastTransitionTime:
                                  description: The time of last state transition.
                                  format: date-time
                                  type: string
                              type: object
                          type: object
                  version: v1alpha1
                  subresources:
                    status: {}
                status:
                  acceptedNames:
                    kind: ""
                    plural: ""
                  conditions: []
                  storedVersions: []
                ---
                # Source: volcano/templates/bus_v1alpha1_command.yaml
                apiVersion: apiextensions.k8s.io/v1beta1
                kind: CustomResourceDefinition
                metadata:
                  name: commands.bus.volcano.sh
                spec:
                  group: bus.volcano.sh
                  names:
                    kind: Command
                    plural: commands
                  scope: Namespaced
                  validation:
                    openAPIV3Schema:
                      type: object
                      properties:
                        action:
                          description: Action defines the action that will be took to the target object.
                          type: string
                        apiVersion:
                          description: 'APIVersion defines the versioned schema of this representation
                            of an object. Servers should convert recognized schemas to the latest
                            internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#resources'
                          type: string
                        kind:
                          description: 'Kind is a string value representing the REST resource this
                            object represents. Servers may infer this from the endpoint the client
                            submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#types-kinds'
                          type: string
                        message:
                          description: Human-readable message indicating details of this command.
                          type: string
                        metadata:
                          type: object
                        reason:
                          description: Unique, one-word, CamelCase reason for this command.
                          type: string
                        target:
                          description: TargetObject defines the target object of this command.
                          type: object
                  version: v1alpha1
                status:
                  acceptedNames:
                    kind: ""
                    plural: ""
                  conditions: []
                  storedVersions: []
                ---
                # Source: volcano/templates/scheduling_v1beta1_podgroup.yaml
                apiVersion: apiextensions.k8s.io/v1beta1
                kind: CustomResourceDefinition
                metadata:
                  name: podgroups.scheduling.volcano.sh
                spec:
                  group: scheduling.volcano.sh
                  names:
                    kind: PodGroup
                    plural: podgroups
                    shortNames:
                      - pg
                      - podgroup-v1beta1
                  scope: Namespaced
                  validation:
                    openAPIV3Schema:
                      properties:
                        apiVersion:
                          type: string
                        kind:
                          type: string
                        metadata:
                          type: object
                        spec:
                          properties:
                            minMember:
                              format: int32
                              type: integer
                            queue:
                              type: string
                            priorityClassName:
                              type: string
                          type: object
                        status:
                          properties:
                            succeeded:
                              format: int32
                              type: integer
                            failed:
                              format: int32
                              type: integer
                            running:
                              format: int32
                              type: integer
                          type: object
                      type: object
                  version: v1beta1
                ---
                # Source: volcano/templates/scheduling_v1beta1_queue.yaml
                apiVersion: apiextensions.k8s.io/v1beta1
                kind: CustomResourceDefinition
                metadata:
                  name: queues.scheduling.volcano.sh
                spec:
                  group: scheduling.volcano.sh
                  names:
                    kind: Queue
                    plural: queues
                    shortNames:
                      - q
                      - queue-v1beta1
                  scope: Cluster
                  validation:
                    openAPIV3Schema:
                      properties:
                        apiVersion:
                          type: string
                        kind:
                          type: string
                        metadata:
                          type: object
                        spec:
                          properties:
                            weight:
                              format: int32
                              type: integer
                            capability:
                              type: object
                          type: object
                        status:
                          properties:
                            state:
                              type: string
                            unknown:
                              format: int32
                              type: integer
                            pending:
                              format: int32
                              type: integer
                            running:
                              format: int32
                              type: integer
                            inqueue:
                              format: int32
                              type: integer
                          type: object
                      type: object
                  version: v1beta1
                  subresources:
                    status: {}
                ---
                # Source: volcano/templates/admission.yaml
                kind: ClusterRole
                apiVersion: rbac.authorization.k8s.io/v1
                metadata:
                  name: volcano-admission
                rules:
                  - apiGroups: [""]
                    resources: ["configmaps"]
                    verbs: ["get", "list", "watch"]
                  - apiGroups: ["admissionregistration.k8s.io"]
                    resources: ["mutatingwebhookconfigurations", "validatingwebhookconfigurations"]
                    verbs: ["get", "list", "watch", "create", "update"]
                  # Rules below is used generate admission service secret
                  - apiGroups: ["certificates.k8s.io"]
                    resources: ["certificatesigningrequests"]
                    verbs: ["get", "list", "create", "delete"]
                  - apiGroups: ["certificates.k8s.io"]
                    resources: ["certificatesigningrequests/approval"]
                    verbs: ["create", "update"]
                  - apiGroups: [""]
                    resources: ["secrets"]
                    verbs: ["create", "get", "patch"]
                  - apiGroups: ["scheduling.incubator.k8s.io", "scheduling.volcano.sh"]
                    resources: ["queues"]
                    verbs: ["get", "list"]
                  - apiGroups: [""]
                    resources: ["services"]
                    verbs: ["get"]
                  - apiGroups: ["scheduling.incubator.k8s.io", "scheduling.volcano.sh"]
                    resources: ["podgroups"]
                    verbs: ["get", "list", "watch"]
                ---
                # Source: volcano/templates/controllers.yaml
                kind: ClusterRole
                apiVersion: rbac.authorization.k8s.io/v1
                metadata:
                  name: volcano-controllers
                rules:
                  - apiGroups: ["apiextensions.k8s.io"]
                    resources: ["customresourcedefinitions"]
                    verbs: ["create", "get", "list", "watch", "delete"]
                  - apiGroups: ["batch.volcano.sh"]
                    resources: ["jobs"]
                    verbs: ["get", "list", "watch", "update", "delete"]
                  - apiGroups: ["batch.volcano.sh"]
                    resources: ["jobs/status", "jobs/finalizers"]
                    verbs: ["update", "patch"]
                  - apiGroups: ["bus.volcano.sh"]
                    resources: ["commands"]
                    verbs: ["get", "list", "watch", "delete"]
                  - apiGroups: [""]
                    resources: ["events"]
                    verbs: ["create", "list", "watch", "update", "patch"]
                  - apiGroups: [""]
                    resources: ["pods"]
                    verbs: ["create", "get", "list", "watch", "update", "bind", "delete"]
                  - apiGroups: [""]
                    resources: ["persistentvolumeclaims"]
                    verbs: ["get", "list", "watch", "create"]
                  - apiGroups: [""]
                    resources: ["services"]
                    verbs: ["get", "list", "watch", "create", "delete"]
                  - apiGroups: [""]
                    resources: ["configmaps"]
                    verbs: ["get", "list", "watch", "create", "delete", "update"]
                  - apiGroups: [""]
                    resources: ["secrets"]
                    verbs: ["get", "list", "watch", "create", "delete", "update"]
                  - apiGroups: ["scheduling.incubator.k8s.io", "scheduling.volcano.sh"]
                    resources: ["podgroups", "queues", "queues/status"]
                    verbs: ["get", "list", "watch", "create", "delete", "update"]
                  - apiGroups: ["scheduling.k8s.io"]
                    resources: ["priorityclasses"]
                    verbs: ["get", "list", "watch", "create", "delete"]
                  - apiGroups: ["networking.k8s.io"]
                    resources: ["networkpolicies"]
                    verbs: ["get", "create"]
                ---
                # Source: volcano/templates/scheduler.yaml
                kind: ClusterRole
                apiVersion: rbac.authorization.k8s.io/v1
                metadata:
                  name: volcano-scheduler
                rules:
                  - apiGroups: ["apiextensions.k8s.io"]
                    resources: ["customresourcedefinitions"]
                    verbs: ["create", "get", "list", "watch", "delete"]
                  - apiGroups: ["batch.volcano.sh"]
                    resources: ["jobs"]
                    verbs: ["get", "list", "watch", "update", "delete"]
                  - apiGroups: ["batch.volcano.sh"]
                    resources: ["jobs/status"]
                    verbs: ["update", "patch"]
                  - apiGroups: [""]
                    resources: ["events"]
                    verbs: ["create", "list", "watch", "update", "patch"]
                  - apiGroups: [""]
                    resources: ["pods", "pods/status"]
                    verbs: ["create", "get", "list", "watch", "update", "patch", "bind", "updateStatus", "delete"]
                  - apiGroups: [""]
                    resources: ["pods/binding"]
                    verbs: ["create"]
                  - apiGroups: [""]
                    resources: ["persistentvolumeclaims"]
                    verbs: ["list", "watch"]
                  - apiGroups: [""]
                    resources: ["persistentvolumes"]
                    verbs: ["list", "watch"]
                  - apiGroups: [""]
                    resources: ["namespaces"]
                    verbs: ["list", "watch"]
                  - apiGroups: [""]
                    resources: ["resourcequotas"]
                    verbs: ["list", "watch"]
                  - apiGroups: ["storage.k8s.io"]
                    resources: ["storageclasses"]
                    verbs: ["list", "watch"]
                  - apiGroups: [""]
                    resources: ["nodes"]
                    verbs: ["list", "watch"]
                  - apiGroups: ["policy"]
                    resources: ["poddisruptionbudgets"]
                    verbs: ["list", "watch"]
                  - apiGroups: ["scheduling.k8s.io"]
                    resources: ["priorityclasses"]
                    verbs: ["get", "list", "watch"]
                  - apiGroups: ["scheduling.incubator.k8s.io", "scheduling.volcano.sh"]
                    resources: ["queues"]
                    verbs: ["get", "list", "watch", "create", "delete"]
                  - apiGroups: ["scheduling.incubator.k8s.io", "scheduling.volcano.sh"]
                    resources: ["podgroups"]
                    verbs: ["list", "watch", "update"]
                ---
                # Source: volcano/templates/admission.yaml
                kind: ClusterRoleBinding
                apiVersion: rbac.authorization.k8s.io/v1
                metadata:
                  name: volcano-admission-role
                subjects:
                  - kind: ServiceAccount
                    name: volcano-admission
                    namespace: volcano-system
                roleRef:
                  kind: ClusterRole
                  name: volcano-admission
                  apiGroup: rbac.authorization.k8s.io
                ---
                # Source: volcano/templates/controllers.yaml
                kind: ClusterRoleBinding
                apiVersion: rbac.authorization.k8s.io/v1
                metadata:
                  name: volcano-controllers-role
                subjects:
                  - kind: ServiceAccount
                    name: volcano-controllers
                    namespace: volcano-system
                roleRef:
                  kind: ClusterRole
                  name: volcano-controllers
                  apiGroup: rbac.authorization.k8s.io
                ---
                # Source: volcano/templates/scheduler.yaml
                kind: ClusterRoleBinding
                apiVersion: rbac.authorization.k8s.io/v1
                metadata:
                  name: volcano-scheduler-role
                subjects:
                  - kind: ServiceAccount
                    name: volcano-scheduler
                    namespace: volcano-system
                roleRef:
                  kind: ClusterRole
                  name: volcano-scheduler
                  apiGroup: rbac.authorization.k8s.io
                ---
                # Source: volcano/templates/admission.yaml
                apiVersion: v1
                kind: Service
                metadata:
                  labels:
                    app: volcano-admission
                  name: volcano-admission-service
                  namespace: volcano-system
                spec:
                  ports:
                    - port: 443
                      protocol: TCP
                      targetPort: 8443
                  selector:
                    app: volcano-admission
                  sessionAffinity: None
                ---
                # Source: volcano/templates/admission.yaml
                apiVersion: apps/v1
                kind: Deployment
                metadata:
                  labels:
                    app: volcano-admission
                  name: volcano-admission
                  namespace: volcano-system
                spec:
                  replicas: 1
                  selector:
                    matchLabels:
                      app: volcano-admission
                  template:
                    metadata:
                      labels:
                        app: volcano-admission
                    spec:
                      serviceAccount: volcano-admission
                      containers:
                        - args:
                            - --tls-cert-file=/admission.local.config/certificates/tls.crt
                            - --tls-private-key-file=/admission.local.config/certificates/tls.key
                            - --ca-cert-file=/admission.local.config/certificates/ca.crt
                            - --webhook-namespace=volcano-system
                            - --webhook-service-name=volcano-admission-service
                            - --logtostderr
                            - --port=8443
                            - -v=4
                            - 2>&1
                          image: ${registry}volcanosh/vc-webhook-manager:$version
                          imagePullPolicy: IfNotPresent
                          name: admission
                          volumeMounts:
                            - mountPath: /admission.local.config/certificates
                              name: admission-certs
                              readOnly: true
                      volumes:
                        - name: admission-certs
                          secret:
                            defaultMode: 420
                            secretName: volcano-admission-secret
                ---
                # Source: volcano/templates/controllers.yaml
                kind: Deployment
                apiVersion: apps/v1
                metadata:
                  name: volcano-controllers
                  namespace: volcano-system
                  labels:
                    app: volcano-controller
                spec:
                  replicas: 1
                  selector:
                    matchLabels:
                      app: volcano-controller
                  template:
                    metadata:
                      labels:
                        app: volcano-controller
                    spec:
                      serviceAccount: volcano-controllers
                      containers:
                          - name: volcano-controllers
                            image: ${registry}volcanosh/vc-controller-manager:$version
                            args:
                              - --logtostderr
                              - -v=4
                              - 2>&1
                            imagePullPolicy: "IfNotPresent"
                ---
                # Source: volcano/templates/scheduler.yaml
                kind: Deployment
                apiVersion: apps/v1
                metadata:
                  name: volcano-scheduler
                  namespace: volcano-system
                  labels:
                    app: volcano-scheduler
                spec:
                  replicas: 1
                  selector:
                    matchLabels:
                      app: volcano-scheduler
                  template:
                    metadata:
                      labels:
                        app: volcano-scheduler
                    spec:
                      serviceAccount: volcano-scheduler
                      containers:
                        - name: volcano-scheduler
                          image: ${registry}volcanosh/vc-scheduler:$version
                          args:
                            - --logtostderr
                            - --scheduler-conf=/volcano.scheduler/volcano-scheduler.conf
                            - -v=3
                            - 2>&1
                          imagePullPolicy: "IfNotPresent"
                          volumeMounts:
                            - name: scheduler-config
                              mountPath: /volcano.scheduler
                      volumes:
                        - name: scheduler-config
                          configMap:
                            name: volcano-scheduler-configmap
                ---
                # Source: volcano/templates/admission.yaml
                apiVersion: batch/v1
                kind: Job
                metadata:
                  name: volcano-admission-init
                  namespace: volcano-system
                  labels:
                    app: volcano-admission-init
                spec:
                  backoffLimit: 3
                  template:
                    spec:
                      serviceAccountName: volcano-admission
                      restartPolicy: Never
                      containers:
                        - name: main
                          image: ${registry}volcanosh/vc-webhook-manager:$version
                          imagePullPolicy: IfNotPresent
                          command: ["./gen-admission-secret.sh", "--service", "volcano-admission-service", "--namespace",
                                    "volcano-system", "--secret", "volcano-admission-secret"]
            """.trimIndent().split("---").filter { it.isNotBlank() }

            override fun DeploymentContext.create() {
                yamlResources.forEach { doc ->
                    YamlResource(doc).apply { create() }
                }

                with(cm) { create() }
            }

            override fun DeploymentContext.delete() {
                // Not implemented
            }

            override fun DeploymentContext.isUpToDate(): Boolean = with(cm) { isUpToDate() }
        }
    )
}
