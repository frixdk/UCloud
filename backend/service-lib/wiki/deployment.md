# Deployment Procedure

In this document we will describe the procedures and technologies involved in
the deployment of UCloud services.

## Docker

All services are deployed as a Docker container in Kubernetes.

We host a private Docker registry at https://dreg.cloud.sdu.dk. Contact @hschu12 or @DanThrane for access.

## Kubernetes

Kubernetes handles the orchestration of containers. It is configured via
resources that describe the desired state of the cluster. Common types of
Kubernetes resources include deployments and cron jobs. Kubernetes ensures
that the state described in the resources are met in the cluster.

As a result there are no servers to configure or install software on. We simply
describe to Kubernetes how we wish to run our containers and Kubernetes takes
care of the rest. Once a server has joined the Kubernetes cluster it is ready
to run any of our micro-services.

See the [Kubernetes documentation](https://kubernetes.io/) for more details.

Access to Kubernetes is done through Rancher.

## Rancher

[Rancher](https://rancher.com) is the software we use to manage our Kubernetes
cluster. Visit their [webpage](https://rancher.com) for more information.

## Jenkins

Jenkins is our CI system and is responsible for building and testing code. This
includes the automatic building of Docker containers.

## Procedure and Backwards Compatibility

Containers are built and tested by our CI/CD pipeline.

Under normal conditions, before deploying a new version you must ensure that
the software checks every mark in the following list:

|uncheck_| The software has been built and tested by Jenkins. Tests must pass and the build must be stable.

|uncheck_| Migrations must occur before the deployment of the new software.

|uncheck_| Migrations must not break the existing build. The old and new version must be able to co-exist.

|uncheck_| Breaking changes in the external interface can only occur in major releases (Semantic versioning).

|uncheck_| When introducing breaking changes to a call, the Elasticsearch auditing index for that call must be updated. See [Auditing](./auditing.md) for more information.

.. |uncheck_| raw:: html

    <input disabled="" type="checkbox">

<br>
