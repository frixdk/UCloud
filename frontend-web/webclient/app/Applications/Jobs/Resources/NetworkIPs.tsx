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
import ApplicationParameter = compute.ApplicationParameter;
import * as Heading from "ui-components/Heading";
import BaseLink from "ui-components/BaseLink";
import {inDevEnvironment, onDevSite} from "UtilityFunctions";
import {SettingsBox} from "UserSettings/UserSettings";

export const NetworkIPResource: React.FunctionComponent<{
    application: UCloud.compute.Application;
    params: ApplicationParameter[];
    errors: Record<string, string>;
    onAdd: () => void;
    onRemove: (id: string) => void;
    provider?: string;
}> = ({params, errors, onAdd, onRemove, provider}) => {
    if (!inDevEnvironment() && !onDevSite() && localStorage.getItem("enablepublicip") == null) return null;

    return <SettingsBox>
        <Flex alignItems="center">
            <Box flexGrow={1}>
                <Heading.h4>Attach public IP addresses to your application</Heading.h4>
            </Box>

            <Button mt="4px" type={"button"} ml={"5px"} lineHeight={"16px"} onClick={onAdd}>Add public IP</Button>
        </Flex>

        <Box my={8}>
            {params.length !== 0 ?
                <Box mb="6px">
                    <Warning>
                        By enabling this setting, anyone with the IP can contact your application. <i>You</i> must take
                        action to ensure that your application is properly secured.
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
                        &quot;Add public IP&quot;
                    </BaseLink>
                    {" "}
                    to select the correct address.
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
    </SettingsBox>;
}

export function getProviderField(): string | undefined {
    try {
        const validatedMachineReservation = validateMachineReservation();
        return validatedMachineReservation?.provider;
    } catch (e) {
        return undefined;
    }
}
