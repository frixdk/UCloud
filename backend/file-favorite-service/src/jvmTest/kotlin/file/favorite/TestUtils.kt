package dk.sdu.cloud.file.favorite

import dk.sdu.cloud.file.api.FileType
import dk.sdu.cloud.file.api.SensitivityLevel
import dk.sdu.cloud.file.api.StorageFile
import dk.sdu.cloud.service.test.TestUsers

internal val storageFile = StorageFile(
    FileType.FILE,
    "/home/user/1",
    12345,
    1234567,
    TestUsers.user.username,
    1234,
    emptyList(),
    SensitivityLevel.PRIVATE,
    SensitivityLevel.PRIVATE
)
