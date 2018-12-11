import * as React from "react";
import * as Modal from "react-modal";
import { Progress, Icon, Button, ButtonGroup, Heading, Divider } from "ui-components";
import * as ReactDropzone from "react-dropzone/dist/index";
import { Cloud } from "Authentication/SDUCloudObject";
import { ifPresent, iconFromFilePath, infoNotification, uploadsNotifications, prettierString } from "UtilityFunctions";
import { fileSizeToString } from "Utilities/FileUtilities";
import { bulkUpload, multipartUpload, BulkUploadPolicy } from "./api";
import { connect } from "react-redux";
import { ReduxObject, Sensitivity } from "DefaultObjects";
import { Upload, UploaderProps } from ".";
import { setUploaderVisible, setUploads, setUploaderError } from "Uploader/Redux/UploaderActions";
import { removeEntry } from "Utilities/CollectionUtilities";
import { Box, Flex, Error } from "ui-components";
import ClickableDropdown from "ui-components/ClickableDropdown";
import { Toggle } from "ui-components/Toggle";
import styled from "styled-components";
import { TextSpan } from "ui-components/Text";

const uploadsFinished = (uploads: Upload[]): boolean => uploads.every((it) => isFinishedUploading(it.uploadXHR));
const finishedUploads = (uploads: Upload[]): number => uploads.filter((it) => isFinishedUploading(it.uploadXHR)).length;
const isFinishedUploading = (xhr?: XMLHttpRequest): boolean => !!xhr && xhr.readyState === XMLHttpRequest.DONE;

const newUpload = (file: File): Upload => ({
    file,
    sensitivity: "PRIVATE",
    isUploading: false,
    progressPercentage: 0,
    extractArchive: false,
    uploadXHR: undefined
});

class Uploader extends React.Component<UploaderProps> {
    constructor(props) {
        super(props);
    }

    onFilesAdded = (files: File[]) => {
        if (files.some(it => it.size === 0)) infoNotification("It is not possible to upload empty files.");
        const filteredFiles = files.filter(it => it.size > 0).map(it => newUpload(it));
        if (filteredFiles.length == 0) return;
        if (this.props.allowMultiple !== false) { // true if no value
            this.props.dispatch(setUploads(this.props.uploads.concat(filteredFiles)))
        } else {
            this.props.dispatch(setUploads([filteredFiles[0]]))
        }
    }

    beforeUnload = e => {
        e.returnValue = "foo";
        uploadsNotifications(finishedUploads(this.props.uploads), this.props.uploads.length)
        return e;
    }

    startUpload = (index: number) => {
        const upload = this.props.uploads[index];
        upload.isUploading = true;
        this.props.dispatch(setUploads(this.props.uploads));
        const onThen = (xhr: XMLHttpRequest) => {
            xhr.onloadend = () => {
                if (!!this.props.onFilesUploaded && uploadsFinished(this.props.uploads)) {
                    window.removeEventListener("beforeunload", this.beforeUnload);
                    this.props.onFilesUploaded(this.props.location);
                }
            }
            upload.uploadXHR = xhr;
            this.props.dispatch(setUploads(this.props.uploads));
        };

        window.addEventListener("beforeunload", this.beforeUnload);
        if (!upload.extractArchive) {
            multipartUpload(`${this.props.location}/${upload.file.name}`, upload.file, upload.sensitivity, e => {
                upload.progressPercentage = (e.loaded / e.total) * 100;
                this.props.dispatch(setUploads(this.props.uploads));
            }, (err) => this.props.dispatch(setUploaderError(err))).then(xhr => onThen(xhr)); // FIXME Add error handling
        } else {
            bulkUpload(this.props.location, upload.file, upload.sensitivity, BulkUploadPolicy.OVERWRITE, e => {
                upload.progressPercentage = (e.loaded / e.total) * 100;
                this.props.dispatch(setUploads(this.props.uploads));
            }, (err) => this.props.dispatch(setUploaderError(err))).then(xhr => onThen(xhr)); // FIXME Add error handling
        }
    }

    startAllUploads = event => {
        event.preventDefault();
        const length = this.props.uploads.length;
        for (let i = 0; i < length; i++) {
            this.startUpload(i);
        }
    }

    removeUpload = (index: number) => {
        const files = this.props.uploads.slice();
        if (index < files.length) {
            const remainderFiles = removeEntry(files, index);
            this.props.dispatch(setUploads(remainderFiles));
        }
    }

    abort = (index: number) => {
        const upload = this.props.uploads[index];
        if (!!upload.uploadXHR && upload.uploadXHR.readyState != XMLHttpRequest.DONE) {
            upload.uploadXHR.abort();
            this.removeUpload(index);
        }
    }

    onExtractChange = (index: number, value: boolean) => {
        const uploads = this.props.uploads;
        uploads[index].extractArchive = value;
        this.props.dispatch(setUploads(uploads));
    }

    updateSensitivity(index: number, sensitivity: Sensitivity) {
        const uploads = this.props.uploads;
        uploads[index].sensitivity = sensitivity;
        this.props.dispatch(setUploads(uploads));
    }

    render() {
        return (
            <Modal isOpen={this.props.visible} shouldCloseOnEsc ariaHideApp={false} onRequestClose={() => this.props.dispatch(setUploaderVisible(false))}
                style={{
                    content: {
                        top: "80px",
                        left: "10%",
                        right: "10%",
                        height: "auto"
                    }
                }}
            >
                <Heading>Upload Files</Heading>
                <Divider />
                {this.props.error ?
                    <Box pt="0.5em" pr="0.5em" pl="0.5em">
                        <Error error={this.props.error} clearError={() => this.props.dispatch(setUploaderError())} />
                    </Box> : null}
                <Box>
                    <div>
                        {this.props.uploads.map((upload, index) => (
                            <UploaderRow
                                key={index}
                                {...upload}
                                setSensitivity={sensitivity => this.updateSensitivity(index, sensitivity)}
                                onExtractChange={value => this.onExtractChange(index, value)}
                                onUpload={() => this.startUpload(index)}
                                onDelete={it => { it.preventDefault(); this.removeUpload(index) }}
                                onAbort={it => { it.preventDefault(); this.abort(index) }}
                            />
                        ))}

                        {this.props.uploads.filter(it => !it.isUploading).length > 1 ?
                            <Button
                                fullWidth
                                color={"green"}
                                onClick={this.startAllUploads}
                            ><Icon name={"upload"} />Start all!</Button>
                            : null}
                        <ReactDropzone onDrop={this.onFilesAdded}>
                            {({ getRootProps, getInputProps }) =>
                                <DropZoneBox {...getRootProps()}>
                                    <input {...getInputProps()} />
                                    <p>
                                        <TextSpan mr="0.5em"><Icon name="upload" /></TextSpan>
                                        <TextSpan mr="0.3em">Drop files here or </TextSpan><a href="#">{" browse"}</a>
                                    </p>
                                    <p>
                                        <b>Bulk upload</b> supported for file types: <i><code>{archiveExtensions.join(", ")}</code></i>
                                    </p>
                                </DropZoneBox>
                            }
                        </ReactDropzone>
                    </div>
                </Box>
            </Modal>

        );
    }
}

const DropZoneBox = styled(Box)`
    width: 100%;
    height: 100px; 
    border-width: 2px; 
    border-color: rgb(102, 102, 102); 
    border-style: dashed; 
    border-radius: 5px;
    margin: 16px 0 16px 0;

    & > p {
        margin: 16px;
    }
`;

const privacyOptions = [
    { text: "Private", value: "PRIVATE" },
    { text: "Confidential", value: "CONFIDENTIAL" },
    { text: "Sensitive", value: "SENSITIVE" }
]

const UploaderRow = (p: {
    file: File,
    extractArchive: boolean,
    sensitivity: Sensitivity
    isUploading: boolean,
    progressPercentage: number,
    uploadXHR?: XMLHttpRequest,
    setSensitivity: (key: Sensitivity) => void,
    onExtractChange?: (value: boolean) => void,
    onUpload?: (e: React.MouseEvent<any>) => void,
    onDelete?: (e: React.MouseEvent<any>) => void,
    onAbort?: (e: React.MouseEvent<any>) => void
    onCheck?: (checked) => void
}) => {
    const fileTitle = <span><b>{p.file.name}</b> ({fileSizeToString(p.file.size)})</span>;
    let body;

    if (!p.isUploading) {
        body = <>
            <Box width={0.7}>
                {fileTitle}
                <br />
                {
                    isArchiveExtension(p.file.name) ?
                        <Flex>
                            <label>Extract archive?</label>
                            <Box ml="0.5em" />
                            <Toggle
                                checked={p.extractArchive}
                                onChange={() => ifPresent(p.onExtractChange, c => c(!p.extractArchive))}
                            />
                        </Flex> : null
                }
            </Box>
            <Box width={0.3}>
                <ButtonGroup width="100%">
                    <Button
                        color="green"
                        onClick={e => ifPresent(p.onUpload, c => c(e))}
                    ><Icon name="cloud upload" />Upload</Button>
                    <Button color="lightGray" onClick={e => ifPresent(p.onDelete, c => c(e))}><Icon name="close" /></Button>
                </ButtonGroup>
                <Flex justifyContent="center" pt="0.3em">
                    <ClickableDropdown
                        chevron
                        trigger={prettierString(p.sensitivity)}
                        onChange={key => p.setSensitivity(key as Sensitivity)}
                        options={privacyOptions}
                    />
                </Flex>
            </Box>
        </>;
    } else {
        body = <>
            <Box width={0.25}>
                {fileTitle}
                <br />
                {
                    isArchiveExtension(p.file.name) ?
                        (p.extractArchive ?
                            <span><Icon name="checkmark" color="green" />Extracting archive</span> :
                            <span><Icon name="close" color="red" /> <i>Not</i> extracting archive</span>)
                        : null
                }
            </Box>

            <Box width={0.45} ml="0.5em" mr="0.5em" pl="0.5" pr="0.5">
                <Progress
                    active={p.progressPercentage !== 100}
                    color="green"
                    label={`${p.progressPercentage.toFixed(2)}%`}
                    percent={p.progressPercentage}
                />
            </Box>

            <Box width={0.22}>
                <Button
                    fullWidth
                    disabled={isFinishedUploading(p.uploadXHR)}
                    color="red"
                    onClick={e => ifPresent(p.onAbort, c => c(e))}
                >Cancel</Button>
            </Box>
        </>;
    }

    return (
        <Flex flexDirection="row">
            <Box width={0.08} textAlign="center">
                <Icon name={iconFromFilePath(p.file.name, "FILE", Cloud.homeFolder)} />
            </Box>
            <Flex width={0.92}>{body}</Flex>
        </Flex>
    );
}

const archiveExtensions: string[] = [".tar.gz", ".zip"]
const isArchiveExtension = (fileName: string): boolean => archiveExtensions.some(it => fileName.endsWith(it));

const mapStateToProps = ({ files, uploader }: ReduxObject): any => ({
    activeUploads: uploader.uploads.filter(it => it.uploadXHR && it.uploadXHR.readyState !== XMLHttpRequest.DONE),
    location: files.path,
    visible: uploader.visible,
    allowMultiple: true,
    uploads: uploader.uploads,
    onFilesUploaded: uploader.onFilesUploaded,
    error: uploader.error
});

export default connect(mapStateToProps)(Uploader);