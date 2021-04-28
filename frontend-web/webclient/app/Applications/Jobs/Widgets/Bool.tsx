import * as React from "react";
import * as UCloud from "UCloud";
import {widgetId, WidgetProps, WidgetSetter, WidgetValidator} from "./index";
import {Select} from "ui-components";
import {compute} from "UCloud";
import Flex from "ui-components/Flex";

interface BoolProps extends WidgetProps {
    parameter: UCloud.compute.ApplicationParameterNS.Bool;
}

export const BoolParameter: React.FunctionComponent<BoolProps> = props => {
    const error = props.errors[props.parameter.name] != null;
    return <Flex>
        <Select id={widgetId(props.parameter)} error={error}>
            <option value={""}/>
            <option value="true">{props.parameter.trueValue}</option>
            <option value="false">{props.parameter.falseValue}</option>
        </Select>
    </Flex>;
};

export const BoolValidator: WidgetValidator = (param) => {
    if (param.type === "boolean") {
        const elem = findElement(param);
        if (elem === null || elem.value === "") {
            return {valid: true}; // Checked later if mandatory
        } else if (elem.value === "false") {
            return {valid: true, value: {type: "boolean", value: false}};
        } else if (elem.value === "true") {
            return {valid: true, value: {type: "boolean", value: true}};
        }
    }

    return {valid: true};
};

export const BoolSetter: WidgetSetter = (param, value) => {
    if (param.type !== "boolean") return;

    const selector = findElement(param);
    if (!selector) throw "Missing element for: " + param.name;
    selector.value = (value as UCloud.compute.AppParameterValueNS.Bool).value ? "true" : "false";
};

function findElement(param: compute.ApplicationParameterNS.Bool): HTMLSelectElement | null {
    return document.getElementById(widgetId(param)) as HTMLSelectElement | null;
}

