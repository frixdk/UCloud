import * as React from "react";
import * as UCloud from "UCloud";
import {widgetId, WidgetProps, WidgetSetter, WidgetValidator} from "./index";
import {Input} from "ui-components";
import {useLayoutEffect, useState} from "react";
import {getProjectNames} from "Utilities/ProjectUtilities";
import {useProjectStatus} from "Project/cache";
import {compute} from "UCloud";
import {styled} from "@linaria/react";

type GenericFileParam =
    UCloud.compute.ApplicationParameterNS.InputFile |
    UCloud.compute.ApplicationParameterNS.InputDirectory;

interface FilesProps extends WidgetProps {
    parameter: GenericFileParam;
}

export const FilesParameter: React.FunctionComponent<FilesProps> = props => {
    const isDirectoryInput = props.parameter.type === "input_directory";
    const [isOpen, setOpen] = useState(false);

    const valueInput = () => {
        return document.getElementById(widgetId(props.parameter)) as HTMLInputElement | null;
    }
    const visualInput = () => {
        return document.getElementById(widgetId(props.parameter) + "visual") as HTMLInputElement | null
    };

    const projects = getProjectNames(useProjectStatus());

    useLayoutEffect(() => {
        const value = valueInput();
        const visual = visualInput();
        const listener = () => {
            if (value && visual) {
                visual.value = value!.value;
            }
        };
        value!.addEventListener("change", listener);
        return () => {
            value!.removeEventListener("change", listener);
        }
    }, []);

    const error = props.errors[props.parameter.name] != null;
    return null;
    /*
    TODO
    return <FileSelector
        visible={isOpen}

        canSelectFolders={isDirectoryInput}
        onlyAllowFolders={isDirectoryInput}

        onFileSelect={file => {
            valueInput()!.value = file?.path ?? "";
            valueInput()!.dispatchEvent(new Event("change"));
            setOpen(false);
        }}

        trigger={
            <>
                <input type={"hidden"} id={widgetId(props.parameter)}/>
                <FileSelectorInput
                    id={widgetId(props.parameter) + "visual"}
                    placeholder={`No ${isDirectoryInput ? "directory" : "file"} selected`}
                    onClick={() => setOpen(true)}
                    error={error}
                />
            </>
        }
    />;
     */
};

const FileSelectorInput = styled(Input)`
    cursor: pointer;
`;

export const FilesValidator: WidgetValidator = (param) => {
    if (param.type === "input_directory" || param.type === "input_file") {
        const elem = findElement(param);
        if (elem === null) return {valid: true};

        const value = elem.value;
        if (value === "") return {valid: true};
        return {valid: true, value: {type: "file", path: value, readOnly: false}};
    }

    return {valid: true};
};

export const FilesSetter: WidgetSetter = (param, value) => {
    if (param.type !== "input_directory" && param.type !== "input_file") return;
    const file = value as UCloud.compute.AppParameterValueNS.File;

    const selector = findElement(param);
    selector.value = file.path;
    selector.dispatchEvent(new Event("change"));
};

function findElement(param: GenericFileParam): HTMLSelectElement {
    return document.getElementById(widgetId(param)) as HTMLSelectElement;
}
