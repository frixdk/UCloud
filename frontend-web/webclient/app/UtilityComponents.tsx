import HttpClient from "Authentication/lib";
import {KeyCode, SensitivityLevelMap} from "DefaultObjects";
import {dialogStore} from "Dialog/DialogStore";
import {SortOrder} from "Files";
import * as React from "react";
import List from "Shares/List";
import {snackbarStore} from "Snackbar/SnackbarStore";
import styled, {keyframes, css} from "styled-components";
import {
    Absolute, Box, Button, Checkbox, Divider, Flex, FtIcon, Icon, Label, Select, ButtonGroup, Link, Text
} from "ui-components";
import ClickableDropdown from "ui-components/ClickableDropdown";
import {Dropdown, DropdownContent} from "ui-components/Dropdown";
import * as Heading from "ui-components/Heading";
import Input, {InputLabel} from "ui-components/Input";
import {UploadPolicy} from "Uploader/api";
import {directorySizeQuery, fileTablePage, replaceHomeOrProjectFolder, sizeToString} from "Utilities/FileUtilities";
import {copyToClipboard, FtIconProps, inDevEnvironment, stopPropagationAndPreventDefault} from "UtilityFunctions";
import {usePromiseKeeper} from "PromiseKeeper";
import {searchPreviousSharedUsers, ServiceOrigin} from "Shares";
import {useCloudAPI} from "Authentication/DataHook";
import {ProjectName} from "Project";
import {height, HeightProps, padding, PaddingProps, width, WidthProps} from "styled-system";
import {useEffect, useRef} from "react";
import {Client} from "Authentication/HttpClientInstance";
import {Spacer} from "ui-components/Spacer";
import {ErrorWrapper} from "ui-components/Error";
import {ThemeColor} from "ui-components/theme";

interface StandardDialog {
    title?: string;
    message: string | JSX.Element;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
    cancelText?: string;
    confirmText?: string;
    validator?: () => boolean;
    addToFront?: boolean;
    confirmButtonColor?: ThemeColor;
    cancelButtonColor?: ThemeColor;
}

export function addStandardDialog({
    title,
    message,
    onConfirm,
    onCancel = () => undefined,
    validator = () => true,
    cancelText = "Cancel",
    confirmText = "Confirm",
    addToFront = false,
    cancelButtonColor = "red",
    confirmButtonColor = "green"
}: StandardDialog): void {
    const validate = (): void => {
        if (validator()) onConfirm();
        dialogStore.success();
    };

    dialogStore.addDialog((
        <div>
            <div>
                <Heading.h3>{title}</Heading.h3>
                {title ? <Divider /> : null}
                <div>{message}</div>
            </div>
            <Flex mt="20px">
                <Button onClick={dialogStore.failure} color={cancelButtonColor} mr="5px">{cancelText}</Button>
                <Button
                    onClick={validate}
                    color={confirmButtonColor}
                >
                    {confirmText}
                </Button>
            </Flex>
        </div>
    ), onCancel, addToFront);
}

interface InputDialog {
    title: string;
    placeholder?: string;
    cancelText?: string;
    confirmText?: string;
    validator?: (val: string) => boolean;
    validationFailureMessage?: string;
    addToFront?: boolean;
    type?: "input" | "textarea";
    help?: JSX.Element;
    width?: string;
}

export async function addStandardInputDialog({
    title,
    help,
    validator = () => true,
    cancelText = "Cancel",
    confirmText = "Submit",
    addToFront = false,
    placeholder = "",
    validationFailureMessage = "error",
    type = "input",
    width = "300px",
}: InputDialog): Promise<{result: string}> {
    return new Promise((resolve, reject) => dialogStore.addDialog(
        <div>
            <div>
                <Heading.h3>{title}</Heading.h3>
                {title ? <Divider /> : null}
                {help ? help : null}
                <Input
                    id={"dialog-input"}
                    as={type}
                    width={width}
                    placeholder={placeholder}
                />
            </div>
            <Flex mt="20px">
                <Button onClick={dialogStore.failure} color="red" mr="5px">{cancelText}</Button>
                <Button
                    onClick={() => {
                        const elem = document.querySelector("#dialog-input") as HTMLInputElement;
                        if (validator(elem.value)) {
                            dialogStore.success();
                            resolve({result: elem.value});
                        }
                        else snackbarStore.addFailure(validationFailureMessage, false);
                    }}
                    color="green"
                >
                    {confirmText}
                </Button>
            </Flex>
        </div>, () => reject({cancelled: true}), addToFront));
}


export function sensitivityDialog(
    sensitivities: (SensitivityLevelMap | null)[]
): Promise<{cancelled: true} | {option: SensitivityLevelMap}> {
    const defaultValue: SensitivityLevelMap = sensitivities.length === 1 ? sensitivities[0] ??
        SensitivityLevelMap.INHERIT : SensitivityLevelMap.INHERIT;
    let option = defaultValue;
    return new Promise(resolve => addStandardDialog({
        title: "Change sensitivity",
        message: (
            <div>
                <Select defaultValue={defaultValue} onChange={e => option = e.target.value as SensitivityLevelMap}>
                    <option value="INHERIT">Inherit</option>
                    <option value="PRIVATE">Private</option>
                    <option value="CONFIDENTIAL">Confidential</option>
                    <option value="SENSITIVE">Sensitive</option>
                </Select>
            </div>
        ),
        onConfirm: () => resolve({option}),
        onCancel: () => resolve({cancelled: true}),
        confirmText: "Change"
    }));
}

export function shareDialog(paths: string[], client: HttpClient): void {
    dialogStore.addDialog(<SharePrompt client={client} paths={paths} />, () => undefined);
}

interface ConfirmCancelButtonsProps {
    confirmText?: string;
    cancelText?: string;
    height?: number | string;
    onConfirm(e: React.SyntheticEvent<HTMLButtonElement>): void;
    onCancel(e: React.SyntheticEvent<HTMLButtonElement>): void;
}

export const ConfirmCancelButtons = ({
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    height
}: ConfirmCancelButtonsProps): JSX.Element => (
    <ButtonGroup width="175px" height={height}>
        <Button onClick={onConfirm} type="button" color="green">{confirmText}</Button>
        <Button onClick={onCancel} type="button" color="red">{cancelText}</Button>
    </ButtonGroup>
);

const SharePromptWrapper = styled(Box)`
    overflow-y: auto;
    overflow-x: hidden;
    max-height: 80vh;
    width: 620px;
`;

export function SharePrompt({paths, client}: {paths: string[]; client: HttpClient}): JSX.Element {
    const SERVICE = ServiceOrigin.SHARE_SERVICE;
    const readEditOptions = [
        {text: "Can view", value: "read"},
        {text: "Can edit", value: "read_edit"}
    ];
    const username = React.useRef<HTMLInputElement>(null);
    const [access, setAccess] = React.useState<"read" | "read_edit">("read");
    const [linkAccess, setLinkAccess] = React.useState<"read" | "read_edit">("read");
    const [loading, setLoading] = React.useState(false);
    const [shareableLink, setShareableLink] = React.useState("");
    const ref = React.useRef<number>(-1);
    const promises = usePromiseKeeper();
    const [searchResponse, setFetchArgs,] = useCloudAPI<{contacts: string[]}>(
        searchPreviousSharedUsers("", SERVICE),
        {contacts: []}
    );
    const onKeyUp = React.useCallback(() => {
        if (ref.current !== -1) {
            window.clearTimeout(ref.current);
        }
        ref.current = (window.setTimeout(() => {
            setFetchArgs(searchPreviousSharedUsers(username.current!.value, SERVICE));
        }, 500));

    }, [username.current, setFetchArgs]);

    return (
        <SharePromptWrapper>
            <Box alignItems="center" width="605px">
                <form autoComplete={"off"} onSubmit={stopPropagationAndPreventDefault}>
                    <Heading.h3>Share</Heading.h3>
                    <Divider />
                    Collaborators
                    <Label>
                        <Dropdown fullWidth hover={false}>
                            <Flex mb="8px">
                                <Input
                                    rightLabel
                                    required
                                    type="text"
                                    ref={username}
                                    placeholder="Enter username..."
                                    onKeyUp={onKeyUp}
                                    autoComplete="off"
                                />
                                <InputLabel width="160px" rightLabel>
                                    <ClickableDropdown
                                        chevron
                                        width="180px"
                                        onChange={(val: "read" | "read_edit") => setAccess(val)}
                                        trigger={access === "read" ? "Can view" : "Can Edit"}
                                        options={readEditOptions}
                                    />
                                </InputLabel>
                                <Button onClick={submit} ml="5px">Add</Button>
                            </Flex>
                            <DropdownContent
                                hover={false}
                                colorOnHover={false}
                                visible={searchResponse.data.contacts.length > 0}
                                width={"418px"}
                                top={"40px"}
                            >
                                {searchResponse.data.contacts.map(it => (
                                    <div
                                        key={it}
                                        onClick={() => {
                                            username.current!.value = it;
                                            setFetchArgs(searchPreviousSharedUsers("", SERVICE));
                                        }}
                                    >
                                        {it}
                                    </div>
                                ))}
                            </DropdownContent>
                        </Dropdown>
                    </Label>
                    {loading ? null : paths.map(path => (<List innerComponent key={path} simple byPath={path} />))}
                </form>
                {!inDevEnvironment() || paths.length !== 1 ? null : (
                    <>
                        <Divider />
                        <Flex>
                            <Heading.h3 mb="4px">Shareable links</Heading.h3>
                            {!shareableLink ? null : (
                                <Text
                                    fontSize="14px"
                                    bold
                                    ml="8px"
                                    mt="9px"
                                    cursor="pointer"
                                    onClick={() => setShareableLink("")}
                                    color="red"
                                >
                                    Remove
                                </Text>
                            )}
                        </Flex>
                        <Flex mb="10px">
                            {!shareableLink ? (
                                <>
                                    <Box mr="auto" />
                                    <Button onClick={() => setShareableLink("https://example.com")}>
                                        Generate Shareable Link
                                    </Button>
                                    <Box ml="12px" mt="6px">
                                        <ClickableDropdown
                                            chevron
                                            onChange={(val: "read" | "read_edit") => setLinkAccess(val)}
                                            trigger={linkAccess === "read" ? "Can view" : "Can Edit"}
                                            options={readEditOptions}
                                        />
                                    </Box>
                                    <Box ml="auto" />
                                </>
                            ) : (
                                    <>
                                        <Input readOnly value={shareableLink} rightLabel />
                                        <InputLabel
                                            rightLabel
                                            onClick={() => copyToClipboard({
                                                value: shareableLink,
                                                message: "Link copied to clipboard"
                                            })}
                                            backgroundColor="blue"
                                            cursor="pointer"
                                        >
                                            Copy
                                    </InputLabel>
                                    </>
                                )}
                        </Flex>
                        <Divider />
                    </>
                )}
                <Flex mt="15px"><Box mr="auto" />
                    <Button type="button" onClick={() => dialogStore.success()}>Close</Button>
                    <Box ml="auto" />
                </Flex>
            </Box>
        </SharePromptWrapper>
    );

    function submit(): void {
        if (username.current == null || !username.current.value) return;
        const value = username.current.value;
        const rights: string[] = [];
        if (access.includes("read")) rights.push("READ");
        if (access.includes("read_edit")) rights.push("WRITE");
        let successes = 0;
        let failures = 0;
        // Replace with Promise.all
        setLoading(true);
        paths.forEach(path => {
            const body = {
                sharedWith: value,
                path,
                rights
            };
            client.put(`/shares/`, body)
                .then(() => {
                    if (++successes === paths.length) snackbarStore.addSuccess("Files shared successfully", false);
                })
                .catch(e => {
                    failures++;
                    if (!(paths.length > 1 && "why" in e.response && e.response.why !== "Already exists"))
                        snackbarStore.addFailure(e.response.why, false);
                }).finally(() => {
                    if (!promises.canceledKeeper && failures + successes === paths.length) setLoading(false);
                });
        });
    }
}

export function overwriteDialog(): Promise<{cancelled?: boolean}> {
    return new Promise(resolve => addStandardDialog({
        title: "Warning",
        message: "The existing file is being overwritten. Cancelling now will corrupt the file. Continue?",
        cancelText: "Continue Upload",
        confirmText: "Cancel Upload",
        onConfirm: () => resolve({}),
        onCancel: () => resolve({cancelled: true})
    }));
}

interface RewritePolicy {
    path: string;
    client: HttpClient;
    filesRemaining: number;
    allowOverwrite: boolean;
    projects: ProjectName[]
}

type RewritePolicyResult = {applyToAll: boolean} & ({cancelled: true} | {policy: UploadPolicy});

export function rewritePolicyDialog({
    path,
    client,
    filesRemaining,
    allowOverwrite,
    projects
}: RewritePolicy): Promise<RewritePolicyResult> {
    let policy = UploadPolicy.RENAME;
    let applyToAll = false;
    return new Promise(resolve => dialogStore.addDialog((
        <div>
            <div>
                <Heading.h3>File exists</Heading.h3>
                <Divider />
                {replaceHomeOrProjectFolder(path, client, projects)} already
                exists. {allowOverwrite ? "How would you like to proceed?" :
                    "Do you wish to continue? Folders cannot be overwritten."}
                <Box mt="10px">
                    <Select onChange={e => policy = e.target.value as UploadPolicy} defaultValue={UploadPolicy.RENAME}>
                        <option value={UploadPolicy.RENAME}>Rename incoming file</option>
                        {!allowOverwrite ? null : <option value={UploadPolicy.OVERWRITE}>Overwrite existing file</option>}
                        {allowOverwrite ? null : <option value={UploadPolicy.MERGE}>Merge</option>}
                    </Select>
                    {filesRemaining > 1 ? (
                        <Flex mt="20px">
                            <Input
                                mr="5px"
                                width="20px"
                                id="applyToAll"
                                type="checkbox"
                                onChange={e => applyToAll = e.target.checked}
                            />
                            <Label htmlFor="applyToAll">Apply to all?</Label>
                        </Flex>
                    ) : null}
                </Box>
            </div>
            <Box textAlign="right" mt="20px">
                <Button
                    onClick={() => {
                        resolve({applyToAll, cancelled: true});
                        dialogStore.failure();
                    }}
                    color="red"
                    mr="5px"
                >
                    No
                </Button>
                <Button
                    onClick={() => {
                        dialogStore.success();
                        resolve({policy, applyToAll});
                    }}
                    color="green"
                >
                    Yes
                </Button>
            </Box>
        </div>
    ), () => resolve({applyToAll, cancelled: true})));
}

interface FileIconProps {
    shared?: boolean;
    fileIcon: FtIconProps;
    size?: string | number;
}

export const FileIcon = ({shared = false, fileIcon, size = 30}: FileIconProps): JSX.Element =>
    shared ? (
        <RelativeFlex>
            <FtIcon size={size} fileIcon={fileIcon} />
            <Absolute bottom="-6px" right="-2px">
                <Dropdown>
                    <Icon size="15px" name="link" color2="white" />
                    <DropdownContent width={"160px"} color="text" colorOnHover={false} backgroundColor="--lightGray">
                        <Text fontSize={1}>{shared ? "This file is shared" : "This is a link to a file"}</Text>
                    </DropdownContent>
                </Dropdown>
            </Absolute>
        </RelativeFlex>
    ) : <FtIcon size={size} fileIcon={fileIcon} />;

const RelativeFlex = styled(Flex)`
    position: relative;
`;

interface Arrow<T> {
    sortBy: T;
    activeSortBy: T;
    order: SortOrder;
}

export function Arrow<T>({sortBy, activeSortBy, order}: Arrow<T>): JSX.Element | null {
    if (sortBy !== activeSortBy) return null;
    if (order === SortOrder.ASCENDING)
        return (<Icon cursor="pointer" name="arrowDown" rotation={180} size=".7em" mr=".4em" />);
    return (<Icon cursor="pointer" name="arrowDown" size=".7em" mr=".4em" />);
}

export function PP(props: {visible: boolean}): JSX.Element | null {
    const [duration, setDuration] = React.useState(500);

    if (!props.visible) return null;
    // From https://codepen.io/nathangath/pen/RgvzVY/
    return (
        <div className="center">
            <svg
                x="0px"
                y="0px"
                viewBox="0 0 128 128"
                stroke="#000"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path id="body">
                    <animate
                        attributeName="fill"
                        dur={`${duration}ms`}
                        repeatCount="indefinite"
                        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1"
                        values="
                            #ff8d8b;
                            #fed689;
                            #88ff89;
                            #87ffff;
                            #8bb5fe;
                            #d78cff;
                            #ff8cff;
                            #ff68f7;
                            #fe6cb7;
                            #ff6968;
                            #ff8d8b
                        "
                    />
                    <animate
                        attributeName="d"
                        dur={`${duration}ms`}
                        repeatCount="indefinite"
                        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1"
                        values="
                            M67.1,109.5c-9.6,0-23.6-8.8-23.6-24c0-12.1,17.8-41,37.5-41c15.6,0,23.3,10.6,25.1,20.5 c1.9,10.7,3.9,8.2,3.9,19.5c0,8.2-3.8,17-3.8,22.3c0,3.9,1.4,7.4,2.9,10.5c1.7,3.5,2.4,6.6,2.4,9.2H9.5c0-13.7,10.8-14,21.1-23 c5.6-4.9,11-12.4,14.5-26;
                            M56.1,107.5c-9.6,0-24.6-13.8-24.6-29c0-16.2,13-42,33.5-42c17.8,0,22.3,11.6,26.1,22.5 c3.6,10.3,9.9,9.2,9.9,20.5c0,8.2-1.8,7-1.8,12.3c0,4.5,3.4,8.2,6.4,14.1c2.5,4.8,4.8,11.2,4.8,20.6h-99c0-12.1,7.2-17.6,14.7-24.3 c3.2-2.9,6.5-5.9,9.2-9.8;
                            M45.1,109.5c-5.5-0.2-27.6-8.4-27.6-27c0-17.9,14.8-42,32.5-42c15.4,0,24,10.4,26.1,21.5 c1.3,6.7,9.9,9.8,9.9,21.5c0,8.2-0.8,6-0.8,11.3c0,7.7,12.8,9,20.8,15c7.7,5.8,15.5,16.7,15.5,16.7h-110c0-4.8,1.7-11.3,5-16 c3.2-4.5,4.5-8.3,5-15;
                            M36,120c-5.5-0.2-28.5-11.9-28.5-30.5c0-16.2,12.5-42,33-42c17.8,0,21.8,9.6,25.6,20.5 C69.7,78.3,76,78.2,76,89.5c0,8.2-0.8,4-0.8,9.3c0,5.9,16.5,7.8,28.4,15.9c8,5.5,17.9,11.8,17.9,11.8h-110c0-2.1-1.2-5.2-1.9-14.5 c-0.3-3.6-0.5-8.1-0.5-13.9;
                            M37,119.5c-15,0.1-33.5-12.7-33.5-30C3.5,73.3,16,47,36.5,47c17.8,0,22.8,11,26,22 C65.6,79.4,73,79.2,73,90.5c0,4-1.8,6.6-1.8,8.3c0,5.9,14.2,6.4,26.4,15.9c7.7,6,13.9,11.8,13.9,11.8H7.5c-1.2-3.4-1.8-7.3-1.9-11.2 c-0.2-5.1,0.3-10.1,0.9-13.7;
                            M40.5,121.5c-12.6,0-30-13.4-30-29C10.5,76.3,23,53,43.5,53c14.5,0,22.8,9.6,25,22 c1.2,6.9,10,9.2,10,20.5c0,4,0,5.6,0,7.3c0,4.9,6.1,7.5,11.2,11.9c5.8,5,7.2,11.8,7.2,11.8H8.5c0-1.5-0.6-6.1,0.4-11.8 c0.6-3.5,1.9-7.5,4.3-11.6;
                            M48.5,121.5c-12.6,0-25-6.3-25-18c0-16.2,13.7-47,36-47c15.6,0,24.8,9.1,27,21.5 c1.2,6.9,7,9.2,7,18.5c0,9.5-4,11-4,22c0,4.1,0.5,5,1,6c0.5,1.2,1,2,1,2h-81c0-5.3,3.1-8.3,6.3-11.5c2.6-2.6,5.4-5.3,6.7-9.5;
                            M68.5,121.5c-12.6,0-33-5.8-33-23c0-9.2,11.8-36,37-36c15.6,0,25.8,8.1,28,20.5 c1.2,6.9,4,6.2,4,15.5c0,9.5-5,15.1-5,21c0,1.9,1,2.3,1,5c0,1.2,0,2,0,2h-91c0.5-7.6,7.1-11.1,13.7-15.7c4.9-3.4,9.9-7.5,12.3-14.3;
                            M73.5,117.5c-12.6,0-30-6.2-30-25c0-14.2,20.9-37,38-37c17.6,0,25.8,11.1,28,23.5 c1.2,6.9,3,7.2,3,16.5c0,12.1-6,16.1-6,22c0,4.2,2,5.3,2,8c0,1.2,0,1,0,1H7.5c2.1-9.4,10.4-13.3,19.2-19.4 c7.1-5,14.4-11.5,18.8-23.6;
                            M80.5,115.5c-12.6,0-32-9.2-32-28c0-14.2,22.9-35,40-35c17.6,0,25.8,12.1,28,24.5 c1.2,6.9,3,6.2,3,15.5c0,12.1-6,19.1-6,25c0,4.2,2,5.3,2,8c0,1.2,0,1,0,1h-102c2.3-8.7,11.6-11.7,20.8-20.1 c5.3-4.8,10.5-11.4,14.2-21.9;
                            M67.1,109.5c-9.6,0-23.6-8.8-23.6-24c0-12.1,17.8-41,37.5-41c15.6,0,23.3,10.6,25.1,20.5 c1.9,10.7,3.9,8.2,3.9,19.5c0,8.2-3.8,17-3.8,22.3c0,3.9,1.4,7.4,2.9,10.5c1.7,3.5,2.4,6.6,2.4,9.2H9.5c0-13.7,10.8-14,21.1-23 c5.6-4.9,11-12.4,14.5-26
                        "
                    />
                </path>
                <path id="beak" fill="#7b8c68">
                    <animate
                        attributeName="d"
                        dur={`${duration}ms`}
                        repeatCount="indefinite"
                        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1"
                        values="
                            M78.29,70c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S78.29,85.5,78.29,70Z;
                            M62.29,64c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S62.29,79.5,62.29,64Z;
                            M48.29,67c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S48.29,82.5,48.29,67Z;
                            M36.29,73c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S36.29,88.5,36.29,73Z;
                            M35.29,75c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S35.29,90.5,35.29,75Z;
                            M41.29,81c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S41.29,96.5,41.29,81Z;
                            M59.29,84c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S59.29,99.5,59.29,84Z;
                            M72.29,89c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S72.29,104.5,72.29,89Z;
                            M80.29,82c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S80.29,97.5,80.29,82Z;
                            M87.29,78c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S87.29,93.5,87.29,78Z;
                            M78.29,70c0-9.92,2.5-14,8-14s8,2.17,8,10.67c0,15.92-7,26.33-7,26.33S78.29,85.5,78.29,70Z"
                    />
                </path>
                <ellipse id="eye-right" rx="3" ry="4">
                    <animate
                        attributeName="cx"
                        dur={`${duration}ms`}
                        repeatCount="indefinite"
                        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1"
                        values="100;84;70;58;57;63;81;94;102;109;100"
                    />
                    <animate
                        attributeName="cy"
                        dur={`${duration}ms`}
                        repeatCount="indefinite"
                        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1"
                        values="62;56;59;65;67;73;76;81;74;70;62"
                    />
                </ellipse>
                <ellipse id="eye-left" rx="3" ry="4">
                    <animate
                        attributeName="cx"
                        dur={`${duration}ms`}
                        repeatCount="indefinite"
                        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1"
                        values="67.5;51.5;37.5;25.5;24.5;30.5;48.5;61.5;69.5;76.5;67.5"
                    />
                    <animate
                        attributeName="cy"
                        dur={`${duration}ms`}
                        repeatCount="indefinite"
                        keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1"
                        values="62;56;59;65;67;73;76;81;74;70;62"
                    />
                </ellipse>
            </svg>
            <RTLInput
                type="range"
                min="200"
                max="2000"
                value={duration}
                step="1"
                id="animationDuration"
                onChange={e => setDuration(parseInt(e.target.value, 10))}
            />
        </div>
    );
}

export const RTLInput = styled.input`
    direction: rtl;
`;

interface MasterCheckbox {
    onClick: (e: boolean) => void;
    checked: boolean;
}

export function MasterCheckbox({onClick, checked}: MasterCheckbox): JSX.Element {

    function onChange(e: React.ChangeEvent<HTMLInputElement>): void {
        e.stopPropagation();
        onClick(e.target.checked);
    }

    return (
        <Label>
            <Checkbox
                data-tag="masterCheckbox"
                checked={checked}
                onChange={onChange}
            />
        </Label>
    );
}

export const NamingField: React.FunctionComponent<{
    onCancel: () => void;
    confirmText: string;
    inputRef: React.MutableRefObject<HTMLInputElement | null>;
    onSubmit: (e: React.SyntheticEvent) => void;
    defaultValue?: string;
}> = props => {
    const submit = React.useCallback((e) => {
        e.preventDefault();
        props.onSubmit(e);
    }, [props.onSubmit]);

    const keyDown = React.useCallback((e) => {
        if (e.keyCode === KeyCode.ESC) {
            props.onCancel();
        }
    }, [props.onCancel]);

    return (
        <form onSubmit={submit}>
            <Flex>
                <Input
                    pt="0px"
                    pb="0px"
                    pr="0px"
                    pl="0px"
                    noBorder
                    defaultValue={props.defaultValue ? props.defaultValue : ""}
                    fontSize={20}
                    maxLength={1024}
                    onKeyDown={keyDown}
                    borderRadius="0px"
                    type="text"
                    width="100%"
                    autoFocus
                    ref={props.inputRef}
                />
                <ConfirmCancelButtons
                    confirmText={props.confirmText}
                    cancelText="Cancel"
                    onConfirm={submit}
                    onCancel={props.onCancel}
                />
            </Flex>
        </form>
    );
};

const loremText = `
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam fringilla ipsum sem, id egestas risus mollis nec.
    Quisque sed efficitur lectus. Vestibulum magna erat, auctor at malesuada ut, scelerisque nec quam. Nam mattis at
    turpis nec vestibulum. Donec vel sapien tempus, porta odio sed, tincidunt metus. Integer ex turpis, pharetra at
    pellentesque ut, suscipit ut tortor. In hac habitasse platea dictumst. Morbi blandit fermentum gravida. Proin in
    ultricies mi, sed bibendum dui. Ut eros risus, ultrices vel nisi ac, sodales dictum arcu. Donec mattis urna nec
    arcu posuere efficitur. Integer luctus ac tellus non tempus. Proin sodales volutpat auctor. Nam laoreet, tellus
    in sodales egestas, odio ante bibendum odio, vel elementum ipsum quam at neque. Aliquam nec nisl sodales, placerat
    odio sit amet, aliquam metus.

    Aenean at nunc venenatis, ultricies ex id, varius enim. Fusce lacinia vulputate est vel bibendum. Ut at consequat
    nulla. Sed placerat erat dolor, in molestie neque egestas nec. Nulla rhoncus, mauris vitae hendrerit volutpat,
    dui mauris scelerisque quam, id rutrum tortor elit nec nunc. Etiam id elementum metus, a tristique mi. Aenean
    imperdiet, quam ac tempus feugiat, magna tellus tristique mauris, at vehicula quam mi vel nunc. Maecenas volutpat
    aliquam elit, eget elementum lorem interdum at.

    Vestibulum id lacus vitae nisi tristique tincidunt. Maecenas facilisis turpis vel metus auctor, in imperdiet dolor
    ultrices. Integer venenatis hendrerit vehicula. Integer id mauris erat. Vivamus posuere sollicitudin purus, vitae
    interdum massa posuere ut. Etiam et eleifend diam, in luctus diam. Aenean volutpat sem id lacus imperdiet malesuada.
    Morbi vulputate est eget leo luctus gravida. Aenean commodo a libero a feugiat. Ut ullamcorper elementum ex, quis
    ultrices nulla congue scelerisque. Phasellus bibendum eu metus ut efficitur.

    Praesent tempor ipsum ac euismod consequat. Quisque semper tortor ac magna aliquam, consectetur pretium sapien
    suscipit. Phasellus eu augue eget massa gravida feugiat sed sit amet ipsum. Aenean condimentum aliquam sapien vel
    suscipit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Orci varius
    natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Integer scelerisque sem leo, nec bibendum
    elit vestibulum ut. Phasellus lacinia venenatis sollicitudin.

    Pellentesque molestie varius fermentum. In eu purus non lacus tincidunt lacinia. In hac habitasse platea dictumst.
    Quisque blandit sed nulla at accumsan. Donec finibus est eros, euismod iaculis diam porttitor ac. Duis nec arcu
    eleifend, ullamcorper quam et, ultricies metus. Vivamus non justo id quam lobortis volutpat.
`.split(" ").map(it => it.trim());

export const Lorem: React.FunctionComponent<{maxLength?: number}> = ({maxLength = 240}) => {
    let builder = "";
    let length = 0;
    let counter = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const nextWord = loremText[counter];
        counter++;
        counter = counter % loremText.length;

        if (nextWord.length + length > maxLength) break;
        if (counter !== 1) builder += " ";
        builder += nextWord;
        length += nextWord.length;
    }
    return <>{builder}</>;
};

export const ImagePlaceholder = styled.div<WidthProps & HeightProps & PaddingProps>`
    ${width} ${height} ${padding}
    background-color: var(--purple, #f00);
`;

export const Center = styled(Box)`
    text-align: center;
`;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useTraceUpdate(props: any, msg?: string): void {
    const prev = useRef(props);
    useEffect(() => {
        const changedProps = Object.entries(props).reduce((ps, [k, v]) => {
            if (prev.current[k] !== v) {
                ps[k] = [prev.current[k], v];
            }
            return ps;
        }, {});
        if (Object.keys(changedProps).length > 0) {
            // This should only be used for debugging
            // eslint-disable-next-line no-console
            console.log('Changed props:', msg, changedProps);
        }
        prev.current = props;
    });
}

const shakeKeyframes = keyframes`
    10%, 90% {
        transform: translate3d(-1px, 0, 0);
    }
      
    20%, 80% {
        transform: translate3d(2px, 0, 0);
    }

    30%, 50%, 70% {
        transform: translate3d(-4px, 0, 0);
    }

    40%, 60% {
        transform: translate3d(4px, 0, 0);
    }
`;

export const shakeAnimation = css<{shaking?: boolean}>`
    &.shaking {
        transform: translate3d(0, 0, 0); 
        animation: ${shakeKeyframes} 0.82s cubic-bezier(.36,.07,.19,.97) both;
    }
    ${p => p.shaking ? css`& {
        transform: translate3d(0, 0, 0);
        animation: ${shakeKeyframes} 0.82s cubic-bezier(.36,.07,.19,.97) both;
    }` : null}
`;

export const shakingClassName = "shaking";

export const ShakingBox = styled(Box) <{shaking?: boolean}>`
    ${shakeAnimation}
`;

const MISSING_COMPUTE_CREDITS = "NOT_ENOUGH_COMPUTE_CREDITS";
const MISSING_STORAGE_CREDITS = "NOT_ENOUGH_STORAGE_CREDITS";
const EXCEEDED_STORAGE_QUOTA = "NOT_ENOUGH_STORAGE_QUOTA";
const NOT_ENOUGH_LICENSE_CREDITS = "NOT_ENOUGH_LICENSE_CREDITS";

export function WalletWarning(props: {errorCode?: string}): JSX.Element | null {
    if (!props.errorCode) return null;
    return (
        <ErrorWrapper bg="lightRed"
            borderColor="red"
            width={1}
        >
            <WarningToOptions errorCode={props.errorCode} />
        </ErrorWrapper>
    );
}

function WarningToOptions(props: {errorCode: string}): JSX.Element {
    const trashFolder = Client.hasActiveProject ?
        `${Client.currentProjectFolder}/Members' Files/${Client.username}/Trash` :
        `${Client.homeFolder}Trash`;

    const workspacePath = Client.hasActiveProject ?
        `${Client.currentProjectFolder}/Members' Files/${Client.username}` : Client.homeFolder;

    const applyPath = Client.hasActiveProject ? "/project/grants/existing" : "/projects/browser/personal";

    const [size] = useCloudAPI<{size: number}>({
        path: directorySizeQuery, method: "POST", payload: {paths: [trashFolder]}
    }, {size: -1});

    switch (props.errorCode) {
        case MISSING_COMPUTE_CREDITS:
        case MISSING_STORAGE_CREDITS: {
            const computeOrStorage = props.errorCode === MISSING_COMPUTE_CREDITS ? "compute" : "storage";
            return (
                <Box mb="8px">
                    <Heading.h4 mb="20px" color="#000">You do not have enough {computeOrStorage} credits.</Heading.h4>
                    <Spacer
                        left={<Text color="#000">Apply for more {computeOrStorage} resources.</Text>}
                        right={<Link to={applyPath}><Button width="150px" height="30px">Apply</Button></Link>}
                    />
                </Box>
            );
        }
        case NOT_ENOUGH_LICENSE_CREDITS: {
            return (
                <Box mb="8px">
                    <Heading.h4 mb="20px" color="#000">You do not have enough license credits.</Heading.h4>
                    <Spacer
                        left={<Text color="#000">You do not have enough credits to use this license. Even free licenses requires a non-zero positive balance.</Text>}
                        right={<Link to={applyPath}><Button width="150px" height="30px">Apply</Button></Link>}
                    />
                </Box>
            )
        }
        case EXCEEDED_STORAGE_QUOTA:
            return (
                <>
                    <Heading.h4 mb="20px" color="#000">You do not have enough storage credit. To get more storage, you could do one of the following:</Heading.h4>
                    <Box mb="8px">
                        <Spacer
                            left={<Text color="#000">Delete files. Your personal workspace files, including job results and trash also count towards your storage quota.</Text>}
                            right={<Link to={fileTablePage(workspacePath)}><Button width="150px" height="30px">Workspace files</Button></Link>}
                        />
                    </Box>
                    {size.data.size >= 0 ?
                        <Box mb="8px">
                            <Spacer
                                left={<Text color="#000">Empty your trash folder. You have {sizeToString(size.data.size)} counting towards your storage quota.</Text>}
                                right={<Link to={fileTablePage(trashFolder)}><Button width="150px" height="30px">To trash folder</Button></Link>}
                            />
                        </Box> : null}
                    <Box mb="8px">
                        <Spacer
                            left={<Text color="#000">Apply for more storage resources.</Text>}
                            right={<Link to={applyPath}><Button width="150px" height="30px">Apply</Button></Link>}
                        />
                    </Box>
                </>
            );
        default:
            return <></>;
    }
}
