import * as React from "react";
import {BoolParameter, BoolSetter, BoolValidator} from "Applications/Jobs/Widgets/Bool";
import * as UCloud from "UCloud";
import * as Heading from "ui-components/Heading";
import {compute} from "UCloud";

type AppParameterValue = compute.AppParameterValue;
type ApplicationParameter = compute.ApplicationParameter;
import {Box, Button, Flex, Icon, Input, Label, Markdown, Text} from "ui-components";
import {FilesParameter, FilesSetter, FilesValidator} from "./GenericFiles";
import {EllipsedText, TextP, TextSpan} from "ui-components/Text";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Fuse from "fuse.js";
import {GenericTextParameter, GenericTextSetter, GenericTextValidator} from "Applications/Jobs/Widgets/GenericText";
import {EnumParameter, EnumSetter, EnumValidator} from "Applications/Jobs/Widgets/Enum";
import {PeerParameter, PeerSetter, PeerValidator} from "Applications/Jobs/Widgets/Peer";
import {LicenseParameter, LicenseSetter, LicenseValidator} from "Applications/Jobs/Widgets/License";
import {IngressParameter, IngressSetter, IngressValidator} from "Applications/Jobs/Widgets/Ingress";
import {NetworkIPParameter, NetworkIPSetter, NetworkIPValidator} from "Applications/Jobs/Widgets/NetworkIP";
import {styled} from "@linaria/react";
import {ButtonStyle} from "ui-components/Button";

// Creating a new widget? Look here. Add it to the WidgetBody, validators and setters.
export type WidgetValidator = (param: ApplicationParameter) => WidgetValidationAnswer;
export type WidgetSetter = (param: ApplicationParameter, value: AppParameterValue) => void;

const WidgetBody: React.FunctionComponent<WidgetProps> = props => {
    switch (props.parameter.type) {
        case "boolean":
            return <BoolParameter {...props} parameter={props.parameter}/>;
        case "input_directory":
        case "input_file":
            return <FilesParameter {...props} parameter={props.parameter}/>;
        case "text":
        case "floating_point":
        case "integer":
            return <GenericTextParameter {...props} parameter={props.parameter}/>;
        case "enumeration":
            return <EnumParameter {...props} parameter={props.parameter}/>;
        case "peer":
            return <PeerParameter {...props} parameter={props.parameter}/>;
        case "license_server":
            return <LicenseParameter {...props} parameter={props.parameter}/>;
        case "ingress":
            return <IngressParameter {...props} parameter={props.parameter}/>;
        case "network_ip":
            return <NetworkIPParameter {...props} parameter={props.parameter}/>;
    }
};

const validators: WidgetValidator[] = [
    BoolValidator,
    GenericTextValidator,
    FilesValidator,
    EnumValidator,
    PeerValidator,
    LicenseValidator,
    IngressValidator,
    NetworkIPValidator,
];

const setters: WidgetSetter[] = [
    BoolSetter,
    GenericTextSetter,
    FilesSetter,
    EnumSetter,
    PeerSetter,
    LicenseSetter,
    IngressSetter,
    NetworkIPSetter,
];

export interface WidgetProps {
    provider?: string;
    parameter: ApplicationParameter;
    errors: Record<string, string>;
}

interface RootWidgetProps {
    onRemove?: () => void;
    active?: boolean;
    onActivate?: () => void;
}

const InactiveWidget = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;

  strong, & > ${EllipsedText} {
    user-select: none;
  }

  strong {
    margin-right: 16px;
    font-weight: bold;
    flex-shrink: 0;
  }

  & > ${EllipsedText} {
    color: var(--gray, #f00);
    flex-grow: 1;
  }

  & > ${EllipsedText} > p {
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & > ${ButtonStyle} {
    margin-left: 16px;
    flex-shrink: 0;
  }
`;

export const Widget: React.FunctionComponent<WidgetProps & RootWidgetProps> = props => {
    const error = props.errors[props.parameter.name];
    const parameter = props.parameter;
    const [open, setOpen] = useState<boolean>(false);
    const toggleOpen = useCallback(() => {
        setOpen(!open);
    }, [open]);

    if (props.active !== false) {
        return <>
            <Box mt={"1em"}>
                <Label fontSize={1} htmlFor={parameter.name}>
                    <Flex>
                        <Flex>
                            {parameter.title}
                            {parameter.optional ? null : <MandatoryField/>}
                        </Flex>
                        {!parameter.optional || !props.onRemove ? null : (
                            <>
                                <Box ml="auto"/>
                                <Text color="red" cursor="pointer" mb="4px" onClick={props.onRemove} selectable={false}>
                                    Remove
                                    <Icon ml="6px" size={16} name="close"/>
                                </Text>
                            </>
                        )}
                    </Flex>
                </Label>
                <WidgetBody {...props} />
                {error ? <TextP color={"red"}>{error}</TextP> : null}
                <Markdown source={parameter.description}/>
            </Box>
        </>;
    } else {
        return <Box>
            <InactiveWidget onClick={toggleOpen}>
                <strong>{parameter.title}</strong>
                {!open ? (
                    <EllipsedText width="200px">
                        <Markdown source={parameter.description} allowedTypes={["text", "paragraph"]}/>
                    </EllipsedText>
                ) : <Box flexGrow={1}/>}

                <Button
                    type="button"
                    lineHeight={"16px"}
                    onClick={e => {
                        e.stopPropagation();
                        if (props.onActivate) props.onActivate();
                    }}
                >
                    Use
                </Button>
            </InactiveWidget>
            {open ? <Markdown source={parameter.description}/> : null}
        </Box>;
    }
};

const OptionalWidgetSearchWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 10px;
  max-height: 35em;
  padding-top: 8px;
  padding-right: 8px;
  padding-bottom: 8px;
  overflow-y: auto;
`;

export const OptionalWidgetSearch: React.FunctionComponent<{
    pool: UCloud.compute.ApplicationParameter[];
    mapper: (p: UCloud.compute.ApplicationParameter) => React.ReactNode;
}> = ({pool, mapper}) => {
    const currentTimeout = useRef<any>(-1);
    const [results, setResults] = useState(pool);
    const searchRef = useRef<HTMLInputElement>(null);

    const fuse = useMemo(() => {
        return new Fuse(pool, {
            shouldSort: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            minMatchCharLength: 1,
            keys: [
                "title",
                "description"
            ]
        });
    }, [pool]);

    const search = useCallback((term: string, delay = 300) => {
        if (currentTimeout.current !== -1) clearTimeout(currentTimeout.current);

        if (term === "") {
            setResults(pool);
        } else {
            currentTimeout.current = setTimeout(() => {
                const newResults = fuse.search(term);
                setResults(newResults.map(it => it.item));
            }, delay);
        }
    }, [fuse, pool]);


    useEffect(() => {
        search(searchRef.current!.value, 0);
    }, [pool]);


    return <Box>
        <Flex mb={16} alignItems={"center"}>
            <Box flexGrow={1}>
                <Heading.h4>Optional Parameters</Heading.h4>
            </Box>
            <Box flexShrink={0}>
                <Input
                    ref={searchRef}
                    placeholder={"Search"}
                    onChange={(e) => search(e.target.value)}
                />
            </Box>
        </Flex>
        <OptionalWidgetSearchWrapper>
            {results.map(it => mapper(it))}
        </OptionalWidgetSearchWrapper>
    </Box>;
};


interface ValidatedWidgets {
    errors: Record<string, string>;
    values: Record<string, AppParameterValue>;
}

export function validateWidgets(params: ApplicationParameter[]): ValidatedWidgets {
    const result: ValidatedWidgets = {errors: {}, values: {}};
    for (const param of params) {
        for (const validator of validators) {
            const validation = validator(param);
            if (!validation.valid) {
                result.errors[param.name] = validation.message ?? "Invalid";
            }

            if (validation.value) {
                result.values[param.name] = validation.value;
            }
        }

        if (!result.errors[param.name] && !result.values[param.name] && !param.optional && param.defaultValue == null) {
            result.errors[param.name] = "A value is missing for this mandatory field";
        }
    }
    return result;
}

export function setWidgetValues(values: { param: ApplicationParameter, value: AppParameterValue }[]): void {
    for (const value of values) {
        for (const setter of setters) {
            setter(value.param, value.value);
        }
    }
}

export interface WidgetValidationAnswer {
    valid: boolean;
    message?: string;
    value?: AppParameterValue;
}

export function widgetId(param: ApplicationParameter): string {
    return `app-param-${param.name}`;
}

export const MandatoryField: React.FunctionComponent = () => <TextSpan ml="4px" bold color="red">*</TextSpan>;
