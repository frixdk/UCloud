import {FileUploadEvent} from "Files/HTML5FileSelector";
import * as UCloud from "UCloud";
import {GetElementType, PropType} from "UtilityFunctions";

export type WriteConflictPolicy = NonNullable<PropType<UCloud.file.orchestrator.FilesCreateUploadRequestItem, "conflictPolicy">>;
export type UploadProtocol = NonNullable<GetElementType<PropType<UCloud.file.orchestrator.FilesCreateUploadRequestItem, "supportedProtocols">>>;

export enum UploadState {
    PENDING,
    UPLOADING,
    DONE
}

export interface Upload {
    row: FileUploadEvent;
    state: UploadState;
    fileSizeInBytes?: number;
    progressInBytes: number;
    error?: string;
    targetPath: string;
    conflictPolicy: WriteConflictPolicy;
    uploadResponse?: UCloud.file.orchestrator.FilesCreateUploadResponseItem;
    terminationRequested?: true;
}

export const supportedProtocols: UploadProtocol[] = ["CHUNKED"];
