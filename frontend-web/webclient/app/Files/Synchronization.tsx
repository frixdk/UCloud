import { useCloudAPI, useCloudCommand } from "Authentication/DataHook";
import {snackbarStore} from "Snackbar/SnackbarStore";
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, Flex, Icon, Input, Label, SelectableText, SelectableTextWrapper } from "ui-components";
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
        synchronizationApi.browseDevices(),
        emptyPageV2
    );
    const [folder, fetchFolder] = useCloudAPI<orchestrator.SynchronizedFolder|undefined>(
        synchronizationApi.retrieveFolder({ path: path }),
        undefined
    );


    const deviceIdRef = useRef<HTMLInputElement>(null);
    const [loading, invokeCommand] = useCloudCommand();
    const [synchronizedFolder, setSynchronizedFolder] = useState<orchestrator.SynchronizedFolder|undefined>(undefined);
    const [ucloudDeviceId, setUcloudDeviceId] = useState<string|undefined>(undefined);

    const addDevice = async e => {
        e.preventDefault();
        if (deviceIdRef.current && deviceIdRef.current.value.length > 0) {
            await invokeCommand(synchronizationApi.addDevice({ id: deviceIdRef.current.value }));
            fetchDevices(synchronizationApi.browseDevices(), true);
            deviceIdRef.current.value = "";
            snackbarStore.addSuccess("Added device", false);
        } else {
            snackbarStore.addFailure("Device ID cannot be empty", false);
        }
    };

    const removeDevice = async (device_id: string) => {
        await invokeCommand(synchronizationApi.removeDevice({ id: device_id }));
        fetchDevices(synchronizationApi.browseDevices(), true);
        snackbarStore.addSuccess("Removed device", false);
    };


    useEffect(() => {
        console.log(synchronizedFolder);
        if (synchronizedFolder) {
            setUcloudDeviceId(synchronizedFolder.device_id);
        }
    }, [synchronizedFolder]);

    useEffect(() => {
        if (folder.data) {
            setSynchronizedFolder(folder.data);
        }
    }, [folder]);

    
    const toggleSynchronizeFolder = async () => {
        if (!synchronizedFolder) {
            await invokeCommand(synchronizationApi.addFolder({ path } ));
            fetchFolder(synchronizationApi.retrieveFolder({ path: path }), true);
        } else {
            if (folder.data) {
                await invokeCommand(synchronizationApi.removeFolder({ id: folder.data.id }));
                setUcloudDeviceId(undefined);
                setSynchronizedFolder(undefined);
            }
        }
    };


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
                <List>
                    {devices.data.items.map(d => {
                        return (
                            <ListRow
                                key={d.id}
                                left={
                                    <>
                                        {d.id}
                                    </>
                                } 
                                right={
                                    <>
                                        <Button color="red" onClick={() => removeDevice(d.id)}>
                                            <Icon name="trash" size="16px"/>
                                        </Button>
                                    </>
                                }
                            />
                        )
                    })}
                </List>
            </>
        ) : (
            <>
                <Box mt="30px" mb="30px">
                    <Label>
                        <Checkbox
                            checked={synchronizedFolder !== undefined}
                            onChange={() => toggleSynchronizeFolder()}
                        /> Add {path} to synchronization
                    </Label>

                </Box>

                {ucloudDeviceId ? (
                    <>
                        Folder is shared from Device ID:
                        <Input readOnly={true} value={ucloudDeviceId} />
                        Add this as a remote device to Syncthing to start synchronizing.
                    </>
                ) : (<></>)}
            </>
        )}
    </>
};
