import { useCloudAPI, useCloudCommand } from "Authentication/DataHook";
import {snackbarStore} from "Snackbar/SnackbarStore";
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, Flex, Icon, Input, Label, SelectableText, SelectableTextWrapper } from "ui-components";
import List, { ListRow } from "ui-components/List";
import { Text } from "ui-components";
import {file, PageV2} from "UCloud";
import synchronizationApi = file.orchestrator.synchronization;
import orchestrator = file.orchestrator;
import { emptyPageV2 } from "DefaultObjects";
import { TextSpan } from "ui-components/Text";

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
                <Text mt="30px">To use the synchronization feature you have to set up a local instance of <a href="https://syncthing.net">Syncthing</a> on your device and add your device ID in Manage devices.</Text>
                <Box mt="30px" mb="30px">
                    <Label>
                        <Checkbox
                            checked={synchronizedFolder !== undefined}
                            onChange={() => toggleSynchronizeFolder()}
                        />
                        <TextSpan fontSize={2}>Add {path} to synchronization</TextSpan>
                    </Label>

                </Box>

                {ucloudDeviceId ? (
                    <>
                        <Text mb="20px">
                            The folder is being synchronized with your devices from Device ID:
                        </Text>
                        <Input readOnly={true} value={ucloudDeviceId} />
                        <Text mt="20px">
                            Add this as a remote device to your local instance of Syncthing to begin synchronization.
                        </Text>
                    </>
                ) : (<></>)}
            </>
        )}
    </>
};
