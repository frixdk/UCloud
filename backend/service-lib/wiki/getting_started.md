# Getting Started

This document describes how to run services locally, and only how to run them locally. __This is not a guide for running
UCloud in production.__

## Dependencies 

To run services locally, the following should be installed on your
system:
 
 - Java 11
   1. Install sdkman: https://sdkman.io/
   2. `sdk i java 11.0.8.hs-adpt`
 - kscript
   - `sdk i kscript`
 - Docker
   - macOS: https://www.docker.com/products/docker-desktop
 - Redis 
   - Docker: `docker run --name redis -d -p 6379:6379 redis:5.0.9`
 - Elasticsearch
   - Docker: `docker run --name elastic -d -p 9200:9200 -e discovery.type=single-node docker.elastic.co/elasticsearch/elasticsearch:7.6.0`
 - PostgreSQL 10
   - macOS: https://postgresapp.com/
 - Kubernetes
   - Minikube: https://kubernetes.io/docs/tasks/tools/install-minikube/
     - macOS: `minikube start -p hyperkit --kubernetes-version v1.15.5`
     - __Note: If you are not running macOS you probably shouldn't specify `-p hyperkit`, you should also remove
       `--context hyperkit` from all commands on this page__
   
## Configuring Minikube to Run Applications

You will need to configure minikube to mount the file-system folder which your local instance is using. 

Save the file below as `/tmp/pvcs.yml`:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: storage
spec:
  capacity:
    storage: 1000Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ""
  hostPath:
    path: "/hosthome"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cephfs
  namespace: app-kubernetes
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ""
  volumeName: storage
  resources:
    requests:
      storage: 1000Gi

```

Then run:

```
kubectl --context hyperkit create ns app-kubernetes
kubectl --context hyperkit create -f /tmp/pvcs.yml
```

From `ucloud/backend/launcher` run the following command:

```
mkdir -p fs/{home,projects}
minikube -p hyperkit mount fs/:/hosthome --uid=11042 --gid=11042
```

## Installing Volcano

You will also need to install Volcano for `app-kubernetes-service` to function correctly. This is typically done by the
deployment scripts in a production environment, but for development purposes you can do the following:

1. Download [this file](./volcano.yml)
2. Run the following command:

```
kubectl --context hyperkit create ns volcano-system
kubectl --context hyperkit create -f volcano.yml
```
   
## Preparing Configuration

Create the file `~/ucloud/config.yml` with the following content:

```yaml
---
refreshToken: theverysecretadmintoken
tokenValidation:
  jwt:
    sharedSecret: notverysecret

database:
   profile: PERSISTENT_POSTGRES
   credentials: # Note Replace with your own postgres credentials
      username: postgres 
      password: postgrespassword

rpc:
   client:
      host:
         host: localhost
         port: 8080
```

## Generating Service Descriptions

Every time a new service is added you will to generate service descriptions. You can do this by running
(from `backend/`):

```
./gradlew generateBuildConfig
```

## Running Database Migrations

This step needs to be done periodically as changes are made to the database. 

Note: Database migrations on development versions sometimes fail due to checksum mismatches. This happens because we
find issues in the database migrations and correct the version directly, as opposed to creating a new one. One way
around this is to recreate the affected schema/the entire database. That is, if you don't want to fix it by hand.

From `ucloud/backend` run the following:

```
./gradlew :launcher:run --args='--dev --run-script migrate-db'
```

Compiling the project from scratch takes approximately 3 minutes. If you get a compilation error similar to this:

```
e: sdu-cloud/backend/service-lib/src/main/kotlin/micro/FlywayFeature.kt: (79, 27): Unresolved reference: resources
```

Then make sure you are currently running Java 11 (`java -version`).

## Running Elasticsearch Migrations

We still don't have a good solution for this. At the moment the following is required to be run from `ucloud/backend`:

```
./gradlew :contact-book-service:run --args='--dev --createIndex'
```

## Creating the Initial Admin User

__NOTE: DATABASE MIGRATIONS MUST HAVE BEEN RUN AT THIS POINT__

Run the following commands in your postgres database:

```sql
insert into auth.principals 
    (dtype, id, created_at, modified_at, role, first_names, last_name, orc_id, 
    phone_number, title, hashed_password, salt, org_id, email) 
values 
    ('PASSWORD', 'admin@dev', now(), now(), 'ADMIN', 'Admin', 'Dev', null, null, null, 
    E'\\xDEADBEEF', E'\\xDEADBEEF', null, 'admin@dev');

insert into auth.refresh_tokens
    (token, associated_user_id, csrf, public_session_reference, extended_by, scopes, 
    expires_after, refresh_token_expiry, extended_by_chain, created_at, ip, user_agent) 
values
    ('theverysecretadmintoken', 'admin@dev', 'csrf', 'initial', null, '["all:write"]'::jsonb, 
    31536000000, null, '[]'::jsonb, now(), '127.0.0.1', 'UCloud');
```

## Starting UCloud


From `ucloud/backend` run the following:

```
./gradlew :launcher:run --args='--dev'
```

From `ucloud/frontend-web/webclient/`

```
npm i
npm run start_use_local_backend
```

UCloud should now be accessible at `http://localhost:8080` for the backend and `http://localhost:9000` for the frontend.

## Creating the Initial User and Test Data

Run the following bash script in your terminal, feel free to change the username and password:

```
#!/usr/bin/env bash
ADMINTOK=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyMSIsInVpZCI6MTAsImxhc3ROYW1lIjoiVXNlciIsImF1ZCI6ImFsbDp3cml0ZSIsInJvbGUiOiJBRE1JTiIsImlzcyI6ImNsb3VkLnNkdS5kayIsImZpcnN0TmFtZXMiOiJVc2VyIiwiZXhwIjozNTUxNDQyMjIzLCJleHRlbmRlZEJ5Q2hhaW4iOltdLCJpYXQiOjE1NTE0NDE2MjMsInByaW5jaXBhbFR5cGUiOiJwYXNzd29yZCIsInB1YmxpY1Nlc3Npb25SZWZlcmVuY2UiOiJyZWYifQ.BNVLnnWoxfE1YG-9u3oqZVUypbbnF4BX3BNb6T1KYquGaCkMgN_fpo63y7Tmh6NYjf3do2j4lf4d6L94f-3d-g

USERNAME=user
PASSWORD=mypassword

if ! command -v jq &> /dev/null
then
    echo "jq could not be found in path (Download: https://stedolan.github.io/jq/)"
    exit
fi

USERTOK=`curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/auth/users/register' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '[{"username": "'"${USERNAME}"'", "password": "'"${PASSWORD}"'", "role": "ADMIN", "email": "user@example.com"}]' | jq .[0].accessToken -r`

ADMINTOK=`curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/auth/users/register' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '[{ "username":  "user1",  "password": "temppass", "role": "ADMIN", "email": "user1@example.com" }]' | jq .[0].accessToken -r`

FIGLET_TOOL='
---
tool: v1

title: Figlet

name: figlet
version: 1.0.0

container: truek/figlets:1.1.1

authors:
- Dan Sebastian Thrane <dthrane@imada.sdu.dk>

description: Tool for rendering text.

defaultTimeAllocation:
  hours: 0
  minutes: 1
  seconds: 0

backend: DOCKER
'

FIGLET_APP='
---
application: v1

title: Figlet
name: figlet
version: 1.0.0

tool:
  name: figlet
  version: 1.0.0

authors:
- Dan Sebastian Thrane <dthrane@imada.sdu.dk>

description: >
  Render some text with Figlet Docker!

invocation:
- figlet-cat
- type: var
  vars: file

parameters:
  file:
    title: "A file to render with figlet"
    type: input_file
'

curl 'http://localhost:8080/api/hpc/tools' -X PUT -H "Authorization: Bearer ${ADMINTOK}" \
    -H 'Content-Type: application/x-yaml' -d "${FIGLET_TOOL}"

curl 'http://localhost:8080/api/hpc/apps' -X PUT -H "Authorization: Bearer ${ADMINTOK}" \
    -H 'Content-Type: application/x-yaml' -d "${FIGLET_APP}"

curl -XPUT -H 'Content-Type: application/json' 'http://localhost:8080/api/products' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "type": "storage", "id": "u1-cephfs", "pricePerUnit": 0, "category": { "id": "u1-cephfs", "provider": "ucloud" } }'

curl -XPUT -H 'Content-Type: application/json' 'http://localhost:8080/api/products' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "type": "compute", "id": "u1-standard-1", "cpu": 1, "pricePerUnit": 0, "category": { "id": "u1-standard", "provider": "ucloud" } }'

projectId=`curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/projects' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "title": "UCloud" , "principalInvestigator": "'"${USERNAME}"'" }' | jq .id -r`

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/projects/invites' \
    -H "Authorization: Bearer ${USERTOK}" \
    -H "Project: ${projectId}" \
    -d '{ "projectId": "'"${projectId}"'", "usernames": ["user1"] }'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/projects/invites/accept' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "projectId": "'"${projectId}"'" }'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/projects/members/change-role' \
    -H "Authorization: Bearer ${USERTOK}" \
    -H "Project: ${projectId}" \
    -d '{ "projectId": "'"${projectId}"'", "member": "user1", "newRole": "ADMIN"}'


providerId=`curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/providers' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -H "Project: ${projectId}" \
    -d '{ "items": [{ "id": "ucloud", "domain": "localhost", "https": false, "port": 8080 }], "type": "bulk"}' | jq .responses[0].id -r`

provider=`curl -H 'Content-Type: application/json' "http://localhost:8080/api/providers/retrieve?id=${providerId}" \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -H "Project: ${projectId}"`

refreshToken=`echo "${provider}" | jq .refreshToken -r`
publicKey=`echo "${provider}" | jq .publicKey -r`

providerConfig="---
app:
  kubernetes:
    providerRefreshToken: ${refreshToken}
    ucloudCertificate: ${publicKey}"

mkdir -p $HOME/ucloud
echo "$providerConfig" > $HOME/ucloud/$providerId-compute-config.yml

curl -XDELETE -H 'Content-Type: application/json' 'http://localhost:8080/api/projects/members' \
    -H "Authorization: Bearer ${USERTOK}" \
    -H "Project: ${projectId}" \
    -d '{ "projectId": "'"${projectId}"'", "member": "user1"}'

aauProjectId=`curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/projects' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "title": "Aau" , "principalInvestigator": "'"${USERNAME}"'" }' | jq .id -r`

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/projects/invites' \
    -H "Authorization: Bearer ${USERTOK}" \
    -H "Project: ${aauProjectId}" \
    -d '{ "projectId": "'"${aauProjectId}"'", "usernames": ["user1"] }'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/projects/invites/accept' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "projectId": "'"${aauProjectId}"'" }'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/projects/members/change-role' \
    -H "Authorization: Bearer ${USERTOK}" \
    -H "Project: ${aauProjectId}" \
    -d '{ "projectId": "'"${aauProjectId}"'", "member": "user1", "newRole": "ADMIN"}'

aauProviderId=`curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/providers' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -H "Project: ${aauProjectId}" \
    -d '{ "items": [{ "id": "aau", "domain": "localhost", "https": false, "port": 8080 }], "type": "bulk"}' | jq ".responses[0].id" -r`

aauProvider=`curl -H 'Content-Type: application/json' "http://localhost:8080/api/providers/retrieve?id=${aauProviderId}" \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -H "Project: ${aauProjectId}"`

aauRefreshToken=`echo "${aauProvider}" | jq .refreshToken -r`
aauPublicKey=`echo "${aauProvider}" | jq .publicKey -r`

aauProviderConfig="---
app:
  aau:
    providerRefreshToken: ${aauRefreshToken}
    ucloudCertificate: ${aauPublicKey}"

echo "$aauProviderConfig" > $HOME/ucloud/ucloud-$aauProviderId-compute-config.yml

curl -XDELETE -H 'Content-Type: application/json' 'http://localhost:8080/api/projects/members' \
    -H "Authorization: Bearer ${USERTOK}" \
    -H "Project: ${aauProjectId}" \
    -d '{ "projectId": "'"${aauProjectId}"'", "member": "user1"}'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/accounting/wallets/set-balance' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "wallet": { "id": "'"${projectId}"'", "type": "PROJECT", "paysFor": { "id": "u1-cephfs", "provider": "ucloud" } }, "lastKnownBalance": 0, "newBalance": 1000000000000000 }'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/accounting/wallets/set-balance' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "wallet": { "id": "'"${projectId}"'", "type": "PROJECT", "paysFor": { "id": "u1-standard", "provider": "ucloud" } }, "lastKnownBalance": 0, "newBalance": 1000000000000000 }'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/grant/set-enabled' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "projectId": "'"${projectId}"'", "enabledStatus": true }'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/grant/request-settings' \
    -H "Authorization: Bearer ${USERTOK}" \
    -H "Project: ${projectId}" \
    -d '{ "allowRequestsFrom": [{"type": "anyone"}], "automaticApproval": { "from": [], "maxResources": [] }, "excludeRequestsFrom": [] }'

curl -XPOST -H 'Content-Type: application/json' 'http://localhost:8080/api/files/quota' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -d '{ "path": "/projects/'"${projectId}"'/", "quotaInBytes": 1000000000000000 }'

curl 'http://localhost:8080/api/hpc/apps/createTag' \
    -H "Authorization: Bearer ${ADMINTOK}" \
    -H 'Content-Type: application/json; charset=utf-8' \
    -d '{"applicationName":"figlet","tags":["Featured"]}'
```

Then restart the UCloud backend service by closing the process and starting it again from `ucloud/backend`:

```
./gradlew :launcher:run --args='--dev'
```

The script will create the user:

- Username: user
- Password: mypassword

Which you should be able to use immediately on your local version of UCloud.

## Next Steps

- Install some applications into the UCloud system, you can find examples [here](../../app-store-service/examples)
- [Create a new provider](../../provider-service/README.md)
- [Learn more about UCloud development](./first_service.md)