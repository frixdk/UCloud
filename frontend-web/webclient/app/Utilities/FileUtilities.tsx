import {Client} from "Authentication/HttpClientInstance";
import HttpClient from "Authentication/lib";
import {SensitivityLevelMap} from "DefaultObjects";
import {File, FileResource, FileType, SortBy, SortOrder} from "Files";
import {SnackType} from "Snackbar/Snackbars";
import {snackbarStore} from "Snackbar/SnackbarStore";
import {Page} from "Types";
import {UploadPolicy} from "Uploader/api";
import {addStandardDialog, rewritePolicyDialog, sensitivityDialog, shareDialog} from "UtilityComponents";
import * as UF from "UtilityFunctions";
import {defaultErrorHandler} from "UtilityFunctions";
import {ErrorMessage, isError, unwrap} from "./XHRUtils";

function getNewPath(newParentPath: string, currentPath: string): string {
    return `${UF.removeTrailingSlash(resolvePath(newParentPath))}/${getFilenameFromPath(resolvePath(currentPath))}`;
}

export enum CopyOrMove {
    Move,
    Copy
}

export async function copyOrMoveFilesNew(operation: CopyOrMove, files: File[], targetPathFolder: string) {
    const copyOrMoveQuery = operation === CopyOrMove.Copy ? copyFileQuery : moveFileQuery;
    let successes = 0;
    let failures = 0;
    const failurePaths: string[] = [];
    let applyToAll = false;
    let policy = UploadPolicy.REJECT;
    let allowRewrite = false;

    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const {exists, newPathForFile, allowOverwrite} = await moveCopySetup({
            targetPath: targetPathFolder,
            path: f.path,
            client: Client
        });
        if (exists && !applyToAll) {
            const result = await rewritePolicyDialog({
                path: newPathForFile,
                homeFolder: Client.homeFolder,
                filesRemaining: files.length - i,
                allowOverwrite
            });
            if (result !== false) {
                allowRewrite = !!result.policy;
                policy = result.policy as UploadPolicy;
                if (files.length - i > 1) applyToAll = result.applyToAll;
            }
        }
        if (applyToAll) allowRewrite = true;
        if ((exists && allowRewrite) || !exists) {
            try {
                const {request} = await Client.post(copyOrMoveQuery(f.path, newPathForFile, policy));
                successes++;
                if (request.status === 202) snackbarStore.addSnack({
                    message: `Operation for ${f.path} is in progress.`,
                    type: SnackType.Success
                });
            } catch {
                failures++;
                failurePaths.push(getFilenameFromPath(f.path));
            }
        }
    }

    if (!failures && successes) {
        onOnlySuccess({operation: operation === CopyOrMove.Copy ? "Copied" : "Moved", fileCount: files.length});
    } else if (failures) {
        snackbarStore.addFailure(
            `Failed to ${operation === CopyOrMove.Copy ? "copy" : "move"} files: ${failurePaths.join(", ")}`
        );
    }
}

interface MoveCopySetup {
    targetPath: string;
    path: string;
    client: HttpClient;
}

async function moveCopySetup({targetPath, path}: MoveCopySetup) {
    const newPathForFile = getNewPath(targetPath, path);
    const stat = await statFileOrNull(newPathForFile);
    return {exists: stat !== null, newPathForFile, allowOverwrite: stat ? stat.fileType !== "DIRECTORY" : true};
}

function onOnlySuccess({operation, fileCount}: {operation: string, fileCount: number}): void {
    snackbarStore.addSnack({message: `${operation} ${fileCount} files`, type: SnackType.Success});
}

export const statFileOrNull = async (path: string): Promise<File | null> => {
    try {
        return (await Client.get<File>(statFileQuery(path))).response;
    } catch (e) {
        return null;
    }
};

export const checkIfFileExists = async (path: string, client: HttpClient): Promise<boolean> => {
    try {
        await client.get(statFileQuery(path));
        return true;
    } catch (e) {
        // FIXME: in the event of other than 404 or 403
        return !(e.request.status === 404 || e.request.status === 403);
    }
};

export type AccessRight = "READ" | "WRITE";

function hasAccess(accessRight: AccessRight, file: File) {
    const username = Client.activeUsername;
    if (file.ownerName === username) return true;
    if (file.acl === null) return true; // If ACL is null, we are still fetching the ACL

    const relevantEntries = file.acl.filter(item => !item.group && item.entity === username);
    return relevantEntries.some(entry => entry.rights.includes(accessRight));
}

export const allFilesHasAccessRight = (accessRight: AccessRight, files: File[]) =>
    files.every(f => hasAccess(accessRight, f));

export function mergeFilePages(basePage: Page<File>, additionalPage: Page<File>, attributesToCopy: FileResource[]) {
    const items = basePage.items.map(base => {
        const additionalFile = additionalPage.items.find(it => it.fileId === base.fileId);
        if (additionalFile !== undefined) {
            return mergeFile(base, additionalFile, attributesToCopy);
        } else {
            return base;
        }
    });

    return {...basePage, items};
}

export function mergeFile(base: File, additional: File, attributesToCopy: FileResource[]): File {
    const result: File = {...base};
    attributesToCopy.forEach(attr => {
        switch (attr) {
            case FileResource.FAVORITED:
                result.favorited = additional.favorited;
                break;
            case FileResource.FILE_TYPE:
                result.fileType = additional.fileType;
                break;
            case FileResource.PATH:
                result.path = additional.path;
                break;
            case FileResource.CREATED_AT:
                result.createdAt = additional.createdAt;
                break;
            case FileResource.MODIFIED_AT:
                result.modifiedAt = additional.modifiedAt;
                break;
            case FileResource.OWNER_NAME:
                result.ownerName = additional.ownerName;
                break;
            case FileResource.SIZE:
                result.size = additional.size;
                break;
            case FileResource.ACL:
                result.acl = additional.acl;
                break;
            case FileResource.SENSITIVITY_LEVEL:
                result.sensitivityLevel = additional.sensitivityLevel;
                break;
            case FileResource.OWN_SENSITIVITY_LEVEL:
                result.ownSensitivityLevel = additional.ownSensitivityLevel;
                break;
            case FileResource.FILE_ID:
                result.fileId = additional.fileId;
                break;
            case FileResource.CREATOR:
                result.creator = additional.creator;
                break;
        }
    });
    return result;
}

/**
 * Used for resolving paths, which contain either "." or "..", and returning the resolved path.
 * @param path The current input path, which can include relative paths
 */
export function resolvePath(path: string) {
    const components = path.split("/");
    const result: string[] = [];
    components.forEach(it => {
        if (it === "") {
            return;
        } else if (it === ".") {
            return;
        } else if (it === "..") {
            result.pop();
        } else {
            result.push(it);
        }
    });
    return "/" + result.join("/");
}

const toAttributesString = (attrs: FileResource[]) =>
    attrs.length > 0 ? `&attributes=${encodeURIComponent(attrs.join(","))}` : "";

export const filepathQuery = (
    path: string,
    page: number,
    itemsPerPage: number,
    order: SortOrder = SortOrder.ASCENDING,
    sortBy: SortBy = SortBy.PATH,
    attrs: FileResource[] = []
): string =>
    `files?path=${encodeURIComponent(resolvePath(path))}&itemsPerPage=${itemsPerPage}&page=${page}&order=${encodeURIComponent(order)}&sortBy=${encodeURIComponent(sortBy)}${toAttributesString(attrs)}`;

export const fileLookupQuery = (
    path: string,
    itemsPerPage: number = 25,
    order: SortOrder = SortOrder.DESCENDING,
    sortBy: SortBy = SortBy.PATH,
    attrs: FileResource[]
): string =>
    `files/lookup?path=${encodeURIComponent(resolvePath(path))}&itemsPerPage=${itemsPerPage}&order=${encodeURIComponent(order)}&sortBy=${encodeURIComponent(sortBy)}${toAttributesString(attrs)}`;

export const filePreviewQuery = (path: string) =>
    `files/preview?path=${encodeURIComponent(resolvePath(path))}`;

export const advancedFileSearch = "/file-search/advanced";

export const recentFilesQuery = "/files/stats/recent";

export function moveFileQuery(path: string, newPath: string, policy?: UploadPolicy): string {
    let query = `/files/move?path=${encodeURIComponent(resolvePath(path))}&newPath=${encodeURIComponent(newPath)}`;
    if (policy) query += `&policy=${policy}`;
    return query;
}

export function copyFileQuery(path: string, newPath: string, policy: UploadPolicy): string {
    let query = `/files/copy?path=${encodeURIComponent(resolvePath(path))}&newPath=${encodeURIComponent(newPath)}`;
    if (policy) query += `&policy=${policy}`;
    return query;
}

export const statFileQuery = (path: string): string => `/files/stat?path=${encodeURIComponent(path)}`;
export const favoritesQuery = (page: number = 0, itemsPerPage: number = 25): string =>
    `/files/favorite?page=${page}&itemsPerPage=${itemsPerPage}`;

export const MOCK_RENAME_TAG = "rename";
export const MOCK_VIRTUAL = "virtual";
export const MOCK_RELATIVE = "relative";

export function mockFile(props: {path: string, type: FileType, fileId?: string, tag?: string}): File {
    const username = Client.activeUsername ? Client.activeUsername : "";
    return {
        fileType: props.type,
        path: props.path,
        creator: username,
        ownerName: username,
        createdAt: new Date().getTime(),
        modifiedAt: new Date().getTime(),
        size: 0,
        acl: [],
        favorited: false,
        sensitivityLevel: SensitivityLevelMap.PRIVATE,
        fileId: props.fileId ? props.fileId : "fileId" + new Date(),
        ownSensitivityLevel: null,
        mockTag: props.tag
    };
}

interface IsInvalidPathname {
    path: string;
    filePaths: string[];
}

/**
 * Checks if a pathname is legal/already in use
 * @param {string} path The path being tested
 * @param {string[]} filePaths the other file paths path is being compared against
 * @returns whether or not the path is invalid
 */
export const isInvalidPathName = ({path, filePaths}: IsInvalidPathname): boolean => {
    if (["..", "/"].some((it) => path.includes(it))) {
        snackbarStore.addFailure("Folder name cannot contain '..' or '/'");
        return true;
    }
    if (path === "" || path === ".") {
        snackbarStore.addFailure("Folder name cannot be empty or be \".\"");
        return true;
    }
    const existingName = filePaths.some(it => it === path);
    if (existingName) {
        snackbarStore.addFailure("File with that name already exists");
        return true;
    }
    return false;
};

/**
 * Checks if the specific folder is a fixed folder, meaning it can not be removed, renamed, deleted, etc.
 * @param {string} filePath the path of the file to be checked
 * @param {string} homeFolder the path for the homefolder of the current user
 */
export const isFixedFolder = (filePath: string, homeFolder: string): boolean => {
    return [ // homeFolder contains trailing slash
        `${homeFolder}Favorites`,
        `${homeFolder}Jobs`,
        `${homeFolder}Trash`
    ].some(it => UF.removeTrailingSlash(it) === filePath);
};

/**
 * Used to favorite/defavorite a file based on its current state.
 * @param {File} file The single file to be favorited
 * @param {Cloud} cloud The cloud instance used to changed the favorite state for the file
 */
export const favoriteFile = async (file: File, client: HttpClient): Promise<File> => {
    try {
        await client.post(favoriteFileQuery(file.path), {});
    } catch (e) {
        UF.errorMessageOrDefault(e, "An error occurred favoriting file.");
        throw e;
    }
    file.favorited = !file.favorited;
    return file;
};

const favoriteFileQuery = (path: string) => `/files/favorite?path=${encodeURIComponent(path)}`;

interface ReclassifyFile {
    file: File;
    sensitivity: SensitivityLevelMap;
    client: HttpClient;
}

export const reclassifyFile = async ({file, sensitivity, client}: ReclassifyFile): Promise<File> => {
    const serializedSensitivity = sensitivity === SensitivityLevelMap.INHERIT ? null : sensitivity;
    const callResult = await unwrap(client.post<void>("/files/reclassify", {
        path: file.path,
        sensitivity: serializedSensitivity
    }));
    if (isError(callResult)) {
        snackbarStore.addFailure((callResult as ErrorMessage).errorMessage);
        return file;
    }
    return {...file, sensitivityLevel: sensitivity, ownSensitivityLevel: sensitivity};
};

export const toFileText = (selectedFiles: File[]): string =>
    `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`;

export const isDirectory = (file: {fileType: FileType}): boolean => file.fileType === "DIRECTORY";
export const replaceHomeFolder = (path: string, homeFolder: string): string => path.replace(homeFolder, "Home/");
export const expandHomeFolder = (path: string, homeFolder: string): string => {
    if (path.startsWith("/Home/"))
        return path.replace("/Home/", homeFolder);
    return path;
};

const extractFilesQuery = "/files/extract";

interface ExtractArchive {
    files: File[];
    client: HttpClient;
    onFinished: () => void;
}

export const extractArchive = async ({files, client, onFinished}: ExtractArchive) => {
    for (const f of files) {
        try {
            await client.post(extractFilesQuery, {path: f.path});
            snackbarStore.addSnack({message: "File extracted", type: SnackType.Success});
        } catch (e) {
            snackbarStore.addFailure(UF.errorMessageOrDefault(e, "An error occurred extracting the file."));
        }
    }
    onFinished();
};

export const clearTrash = ({client, callback}: {client: HttpClient, callback: () => void}) =>
    clearTrashDialog({
        onConfirm: async () => {
            await client.post("/files/trash/clear", {});
            callback();
            snackbarStore.addSnack({message: "Emptying trash", type: SnackType.Information});
        }
    });

export const getParentPath = (path: string): string => {
    if (path.length === 0) return path;
    let splitPath = path.split("/");
    splitPath = splitPath.filter(p => p);
    let parentPath = "/";
    for (let i = 0; i < splitPath.length - 1; i++) {
        parentPath += splitPath[i] + "/";
    }
    return parentPath;
};

const goUpDirectory = (
    count: number,
    path: string
): string => count ? goUpDirectory(count - 1, getParentPath(path)) : path;

const toFileName = (path: string): string => {
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash !== -1 && path.length > lastSlash + 1) {
        return path.substring(lastSlash + 1);
    } else {
        return path;
    }
};

export function getFilenameFromPath(path: string): string {
    const replacedHome = replaceHomeFolder(path, Client.homeFolder);
    const fileName = toFileName(replacedHome);
    if (fileName === "..") return `.. (${toFileName(goUpDirectory(2, replacedHome))})`;
    if (fileName === ".") return `. (Current folder)`;
    return fileName;
}

export function downloadFiles(files: Array<{path: string}>, client: HttpClient) {
    files.map(f => f.path).forEach(p =>
        client.createOneTimeTokenWithPermission("files.download:read").then((token: string) => {
            const element = document.createElement("a");
            const url = client.computeURL(
                "/api",
                `/files/download?path=${encodeURIComponent(p)}&token=${encodeURIComponent(token)}`
            );
            element.setAttribute("href", url);
            element.style.display = "none";
            element.download = url;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }));
}

interface UpdateSensitivity {
    files: File[];
    client: HttpClient;
    onSensitivityChange?: () => void;
}

export async function updateSensitivity({files, client, onSensitivityChange}: UpdateSensitivity) {
    const input = await sensitivityDialog();
    if ("cancelled" in input) return;
    try {
        await Promise.all(files.map(file => reclassifyFile({file, sensitivity: input.option, client})));
    } catch (e) {
        snackbarStore.addFailure(UF.errorMessageOrDefault(e, "Could not reclassify file"));
    } finally {
        if (!!onSensitivityChange) onSensitivityChange();
    }
}

export const fetchFileContent = async (path: string, client: HttpClient): Promise<Response> => {
    const token = await client.createOneTimeTokenWithPermission("files.download:read");
    return fetch(client.computeURL(
        "/api",
        `/files/download?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`)
    );
};

function isInt(value: number) {
    if (isNaN(value)) {
        return false;
    }
    return (value | 0) === value;
}

export const sizeToString = (bytes: number | null): string => {
    if (bytes === null) return "";
    if (bytes < 0) return "Invalid size";
    const {size, unit} = sizeToHumanReadableWithUnit(bytes);

    if (isInt(size)) {
        return `${size} ${unit}`;
    } else {
        return `${size.toFixed(2)} ${unit}`;
    }
};

export function sizeToHumanReadableWithUnit(bytes: number): {size: number, unit: string} {
    if (bytes < 1000) {
        return {size: bytes, unit: "B"};
    } else if (bytes < 1000 ** 2) {
        return {size: (bytes / 1000), unit: "KB"};
    } else if (bytes < 1000 ** 3) {
        return {size: (bytes / 1000 ** 2), unit: "MB"};
    } else if (bytes < 1000 ** 4) {
        return {size: (bytes / 1000 ** 3), unit: "GB"};
    } else if (bytes < 1000 ** 5) {
        return {size: (bytes / 1000 ** 4), unit: "TB"};
    } else if (bytes < 1000 ** 6) {
        return {size: (bytes / 1000 ** 5), unit: "PB"};
    } else {
        return {size: (bytes / 1000 ** 6), unit: "EB"};
    }
}


export const directorySizeQuery = "/files/stats/directory-sizes";

interface ShareFiles {
    files: File[];
    client: HttpClient;
}

export const shareFiles = async ({files, client}: ShareFiles) => {
    shareDialog(files.map(it => it.path), client);
};

const moveToTrashDialog = ({filePaths, onConfirm}: {onConfirm: () => void, filePaths: string[]}): void => {
    const withEllipsis = getFilenameFromPath(filePaths[0]).length > 35;
    const message = filePaths.length > 1 ? `Move ${filePaths.length} files to trash?` :
        `Move file ${getFilenameFromPath(filePaths[0]).slice(0, 35)}${withEllipsis ? "..." : ""} to trash?`;

    addStandardDialog({
        title: "Move files to trash",
        message,
        onConfirm,
        confirmText: "Move files"
    });
};

export function clearTrashDialog({onConfirm}: {onConfirm: () => void}): void {
    addStandardDialog({
        title: "Empty trash?",
        message: "",
        confirmText: "Confirm",
        cancelText: "Cancel",
        onConfirm
    });
}

interface ResultToNotification {
    failures: string[];
    paths: string[];
    homeFolder: string;
}

function resultToNotification({failures, paths, homeFolder}: ResultToNotification) {
    const successMessage = successResponse(paths, homeFolder);
    if (failures.length === 0) {
        snackbarStore.addSnack({message: successMessage, type: SnackType.Success});
    } else if (failures.length === paths.length) {
        snackbarStore.addFailure("Failed moving all files, please try again later");
    } else {
        snackbarStore.addSnack({
            message: `${successMessage}\n Failed to move files: ${failures.join(", ")}`,
            type: SnackType.Information
        });
    }
}

function successResponse(paths: string[], homeFolder: string): string {
    const withEllipsis = replaceHomeFolder(paths[0], homeFolder).length > 25;
    return paths.length > 1 ?
        `${paths.length} files moved to trash.` :
        `${replaceHomeFolder(paths[0], homeFolder).slice(0, 25)}${withEllipsis ? "..." : ""} moved to trash`;
}

interface MoveToTrash {
    files: File[];
    client: HttpClient;
    setLoading: () => void;
    callback: () => void;
}

export const moveToTrash = ({files, client, setLoading, callback}: MoveToTrash) => {
    const paths = files.map(f => f.path);
    moveToTrashDialog({
        filePaths: paths, onConfirm: async () => {
            try {
                setLoading();
                await client.post("/files/trash/", {files: paths});
                snackbarStore.addSnack({message: "Moving files to trash", type: SnackType.Information});
                callback();
            } catch (e) {
                snackbarStore.addFailure(e.why);
                callback();
            }
        }
    });
};

interface MoveFile {
    oldPath: string;
    newPath: string;
    client: HttpClient;
    setLoading: () => void;
    onSuccess: () => void;
}

export async function moveFile({oldPath, newPath, client, setLoading, onSuccess}: MoveFile): Promise<void> {
    setLoading();
    try {
        await client.post(`/files/move?path=${encodeURIComponent(oldPath)}&newPath=${encodeURIComponent(newPath)}`);
        onSuccess();
    } catch (e) {
        defaultErrorHandler(e);
    }
}

interface CreateFolder {
    path: string;
    client: HttpClient;
    onSuccess: () => void;
}

export async function createFolder({path, client, onSuccess}: CreateFolder): Promise<void> {
    try {
        await client.post("/files/directory", {path});
        onSuccess();
        snackbarStore.addSnack({message: "Folder created", type: SnackType.Success});
    } catch (e) {
        snackbarStore.addFailure(UF.errorMessageOrDefault(e, "An error occurred trying to creating the file."));
    }
}

export const inTrashDir = (path: string, client: HttpClient): boolean => getParentPath(path) === client.trashFolder;

export function isAnyMockFile(files: File[]): boolean {
    return files.some(it => it.mockTag !== undefined);
}

export function isAnySharedFs(files: File[]): boolean {
    return files.some(it => it.fileType === "SHARED_FS");
}

export function isFilePreviewSupported(f: File): boolean {
    if (isDirectory(f)) return false;
    if (f.sensitivityLevel === "SENSITIVE") return false;
    if (UF.isExtPreviewSupported(UF.extensionFromPath(f.path))) return true;
    return false;
}

export const fileInfoPage = (path: string): string => `/files/info?path=${encodeURIComponent(resolvePath(path))}`;
export const filePreviewPage = (path: string): string => `/files/preview?path=${encodeURIComponent(resolvePath(path))}`;
export const fileTablePage = (path: string): string => `/files?path=${encodeURIComponent(resolvePath(path))}`;

export const archiveExtensions: string[] = [".tar.gz", ".zip"];
export const isArchiveExtension = (fileName: string): boolean => archiveExtensions.some(it => fileName.endsWith(it));
