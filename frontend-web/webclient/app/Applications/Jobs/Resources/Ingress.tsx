import * as React from "react";
import * as UCloud from "UCloud"
import {
    Box,
    Button,
    Flex,
} from "ui-components";
import Warning from "ui-components/Warning";
import {validateMachineReservation} from "../Widgets/Machines";
import {Widget} from "Applications/Jobs/Widgets";
import {compute} from "UCloud";
type ApplicationParameter = compute.ApplicationParameter;
import * as Heading from "ui-components/Heading";
import BaseLink from "ui-components/BaseLink";

export const IngressResource: React.FunctionComponent<{
    application: UCloud.compute.Application;
    params: ApplicationParameter[];
    errors: Record<string, string>;
    onAdd: () => void;
    onRemove: (id: string) => void;
    provider?: string;
}> = ({application, params, errors, onAdd, onRemove, provider}) => {
    if (application.invocation.applicationType !== "WEB") return null;

    return <Box>
        <Flex alignItems="center">
            <Box flexGrow={1}>
                <Heading.h4>Configure custom links to your application</Heading.h4>
            </Box>

            <Button type={"button"} ml={"5px"} lineHeight={"16px"} onClick={onAdd}>Add public link</Button>
        </Flex>

        <Box my={8}>
            {params.length !== 0 ?
                <Box mb="6px">
                    <Warning>
                        By enabling this setting, anyone with a link can gain access to the application
                    </Warning>
                </Box> :
                <>
                    If your job needs to be publicly accessible via a web-browser then click{" "}
                    <BaseLink
                        href="#"
                        onClick={e => {
                            e.preventDefault();
                            onAdd();
                        }}
                    >
                        &quot;Add public link&quot;
                    </BaseLink>
                    {" "}
                    to select the correct link.
                </>
            }
        </Box>

        {params.map(entry => (
            <Box key={entry.name} mb={"7px"}>
                <Widget
                    provider={provider}
                    parameter={entry}
                    errors={errors}
                    onRemove={() => {
                        onRemove(entry.name);
                    }}
                />
            </Box>
        ))}
    </Box>;
}

export function getProviderField(): string | undefined {
    try {
        const validatedMachineReservation = validateMachineReservation();
        return validatedMachineReservation?.provider;
    } catch (e) {
        return undefined;
    }
}
