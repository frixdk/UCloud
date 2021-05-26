import { useCloudAPI, useCloudCommand } from "Authentication/DataHook";
import {snackbarStore} from "Snackbar/SnackbarStore";
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, Flex, Icon, Input, SelectableText, SelectableTextWrapper } from "ui-components";
import List, { ListRow } from "ui-components/List";
import { stopPropagation } from "UtilityFunctions";
import {file, PageV2} from "UCloud";
import synchronizationApi = file.orchestrator.synchronization;
import orchestrator = file.orchestrator;
import { ListV2 } from "Pagination";
import { emptyPageV2 } from "DefaultObjects";

const Tab: React.FunctionComponent<{ selected: boolean, onClick: () => void }> = props => {
    return <SelectableText
        mr="1em"
        cursor="pointer"
        selected={props.selected}
        fontSize={3}
        onClick={props.onClick}
    >
        {props.children}
    </SelectableText>
};


export const SynchronizationSettings: React.FunctionComponent<{
    path: string;
}> = ({path}) => {
    const [manageDevices, setManageDevices] = useState(false);
    const [devices, fetchDevices] = useCloudAPI<PageV2<orchestrator.SynchronizationDevice>>(
        synchronizationApi.devices(),
        emptyPageV2
    );
    const deviceIdRef = useRef<HTMLInputElement>(null);
    const [loading, invokeCommand] = useCloudCommand();
    const [synchronizeFolder, setSynchronizeFolder] = useState(false);

    const addDevice = async e => {
        e.preventDefault();
        if (deviceIdRef.current && deviceIdRef.current.value.length > 0) {
            await invokeCommand(synchronizationApi.addDevice({ id: deviceIdRef.current.value } ));
        } else {
            snackbarStore.addFailure("Device ID cannot be empty", false)
        }
    };

    /*useEffect(() => {
        fetchDevices(synchronizationApi.devices());
    }, [path]);*/

    return <>
        <SelectableTextWrapper>
            <Tab selected={!manageDevices} onClick={() => setManageDevices(false)}>Synchronize folder</Tab>
            <Tab selected={manageDevices} onClick={() => setManageDevices(true)}>Manage devices</Tab>
        </SelectableTextWrapper>
        {manageDevices ? (
            <>
                <form onSubmit={addDevice}>
                    <Flex mt={10} mb={10}>
                        <Input ref={deviceIdRef} placeholder="Device ID" />
                        <Button color="green" width="160px">Add device</Button>
                    </Flex>
                </form>
                <ListV2
                    loading={devices.loading}
                    onLoadMore={() => {}}
                    page={devices.data}
                    pageRenderer={pageRenderer}
                />
            </>
        ) : (
            <>
                <Box mt="30px" mb="30px">
                    <Checkbox
                        checked={synchronizeFolder}
                        onClick={() => setSynchronizeFolder(!synchronizeFolder)}
                        onChange={stopPropagation}
                    /> Add {path} to synchronization

                </Box>

                Folder is shared from Device ID:
                <Input readOnly={true} value="aaaaaaa-aaaaaaA-bbbbbbb-bbbbbbB-ccccccc-ccccccC-ddddddd-ddddddD" />
            </>
        )}
    </>
};



function pageRenderer(items: orchestrator.SynchronizationDevice[]): React.ReactNode {
    return (
        <List>
            {items.map(p => {
                return (
                    <ListRow
                        key={p.id}
                        left={
                            <>
                                {p.id}
                            </>
                        } 
                        right={
                            <>
                                <Button color="red"><Icon name="trash" size="16px"/></Button>
                            </>
                        }
                    />
                )
            })}
        </List>
    )
}
