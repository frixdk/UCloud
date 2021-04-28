import * as React from "react";
import {Flex} from "ui-components";
import ReactModal from "react-modal";
import {largeModalStyle} from "Utilities/ModalUtilities";
import Browse from "Applications/Ingresses/Browse";
import * as UCloud from "UCloud";
import {widgetId, WidgetProps, WidgetSetter, WidgetValidator} from "Applications/Jobs/Widgets/index";
import {PointerInput} from "Applications/Jobs/Widgets/Peer";
import {useCallback, useLayoutEffect, useState} from "react";
import {compute} from "UCloud";
type Ingress = compute.Ingress;
import {callAPI} from "Authentication/DataHook";

interface IngressProps extends WidgetProps {
    parameter: UCloud.compute.ApplicationParameterNS.Ingress;
}

export const IngressParameter: React.FunctionComponent<IngressProps> = props => {
    const error = props.errors[props.parameter.name] != null;
    const [open, setOpen] = useState(false);
    const doOpen = useCallback(() => {
        setOpen(true);
    }, [setOpen]);
    const doClose = useCallback(() => {
        setOpen(false)
    }, [setOpen]);

    const onUse = useCallback((ingress: Ingress) => {
        IngressSetter(props.parameter, {type: "ingress", id: ingress.id});
        setOpen(false);
    }, [props.parameter, setOpen]);

    const valueInput = () => {
        return document.getElementById(widgetId(props.parameter)) as HTMLInputElement | null;
    }
    const visualInput = () => {
        return document.getElementById(widgetId(props.parameter) + "visual") as HTMLInputElement | null
    };

    useLayoutEffect(() => {
        const listener = async () => {
            const value = valueInput();
            if (value) {
                const ingressId = value!.value;
                const ingress = await callAPI<Ingress>(UCloud.compute.ingresses.retrieve({id: ingressId}));
                const visual = visualInput();
                if (visual) {
                    visual.value = ingress.specification.domain;
                }
            }
        };

        const value = valueInput();
        value!.addEventListener("change", listener);
        return () => {
            value!.removeEventListener("change", listener);
        }
    }, []);

    return (<Flex>
        <PointerInput
            id={widgetId(props.parameter) + "visual"}
            placeholder={"No public link selected"}
            error={error}
            onClick={doOpen}
        />
        <input type="hidden" id={widgetId(props.parameter)}/>
        <ReactModal
            isOpen={open}
            ariaHideApp={false}
            style={largeModalStyle}
            shouldCloseOnEsc
            shouldCloseOnOverlayClick
            onRequestClose={doClose}
        >
            <Browse computeProvider={props.provider} onSelect={onUse}/>
        </ReactModal>
    </Flex>);
}

export const IngressValidator: WidgetValidator = (param) => {
    if (param.type === "ingress") {
        const elem = findElement(param);
        if (elem === null) return {valid: true};
        if (elem.value === "") return {valid: true};
        return {valid: true, value: {type: "ingress", id: elem.value}};
    }

    return {valid: true};
};

export const IngressSetter: WidgetSetter = (param, value) => {
    if (param.type !== "ingress") return;

    const selector = findElement(param);
    if (selector === null) throw "Missing element for: " + param.name;
    selector.value = (value as UCloud.compute.AppParameterValueNS.Ingress).id;
    selector.dispatchEvent(new Event("change"));
};

function findElement(param: compute.ApplicationParameterNS.Ingress): HTMLSelectElement | null {
    return document.getElementById(widgetId(param)) as HTMLSelectElement | null;
}
