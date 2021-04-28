import * as UCloud from "UCloud";
import {GetElementType, PropType} from "UtilityFunctions";

export type FileType = NonNullable<PropType<UCloud.file.orchestrator.UFile, "type">>;
export type FilePermission = GetElementType<NonNullable<PropType<UCloud.file.orchestrator.UFileNS.Permissions, "myself">>>;
export type FileIconHint = NonNullable<PropType<UCloud.file.orchestrator.UFile, "icon">>;
