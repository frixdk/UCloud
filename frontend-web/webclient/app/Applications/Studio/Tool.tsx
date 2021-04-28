import {clearLogo, uploadLogo} from "Applications/api";
import {SmallAppToolCard} from "Applications/Studio/SmallAppToolCard";
import {useCloudCommand, useCloudAPI} from "Authentication/DataHook";
import {Client} from "Authentication/HttpClientInstance";
import {emptyPage} from "DefaultObjects";
import {dialogStore} from "Dialog/DialogStore";
import {MainContainer} from "MainContainer/MainContainer";
import {
    useRefreshFunction
} from "Navigation/Redux/HeaderActions";
import {useLoading} from "Navigation/Redux/StatusActions";
import * as Pagination from "Pagination";
import * as React from "react";
import {useCallback, useEffect, useState} from "react";
import {RouteComponentProps} from "react-router";
import {snackbarStore} from "Snackbar/SnackbarStore";
import {Button, Flex, VerticalButtonGroup} from "ui-components";
import Box from "ui-components/Box";
import * as Heading from "ui-components/Heading";
import {HiddenInputField} from "ui-components/Input";
import Truncate from "ui-components/Truncate";
import {AppToolLogo} from "../AppToolLogo";
import * as UCloud from "UCloud";
import {themeColor} from "ui-components/theme";

export const Tool: React.FunctionComponent<RouteComponentProps<{name: string}>> = props => {
    const name = props.match.params.name;
    if (Client.userRole !== "ADMIN") return null;

    const [commandLoading, invokeCommand] = useCloudCommand();
    const [logoCacheBust, setLogoCacheBust] = useState("" + Date.now());
    const [tool, fetchTools] = useCloudAPI<UCloud.Page<UCloud.compute.Tool>>({noop: true}, emptyPage);
    const [apps, fetchApps] = useCloudAPI<UCloud.Page<UCloud.compute.ApplicationSummaryWithFavorite>>(
        {noop: true}, emptyPage
    );

    const toolTitle = tool.data.items.length > 0 ? tool.data.items[0].description.title : name;

    const refresh = useCallback(() => {
        fetchTools(UCloud.compute.tools.findByName({appName: name, itemsPerPage: 50}));
        fetchApps(UCloud.compute.apps.findLatestByTool({tool: name, page: 0, itemsPerPage: 50}));
    }, [name]);

    useRefreshFunction(refresh);
    useLoading(commandLoading || tool.loading || apps.loading);

    useEffect(() => {
        refresh();
    }, [name]);

    return (
        <MainContainer
            header={(
                <Heading.h1>
                    <AppToolLogo type={"TOOL"} name={name} size={"64px"} />
                    {" "}
                    {toolTitle}
                </Heading.h1>
            )}

            sidebar={(
                <VerticalButtonGroup>
                    <Button fullWidth as="label">
                        Upload Logo
                    <HiddenInputField
                            type="file"
                            onChange={async e => {
                                const target = e.target;
                                if (target.files) {
                                    const file = target.files[0];
                                    target.value = "";
                                    if (file.size > 1024 * 1024 * 5) {
                                        snackbarStore.addFailure("File exceeds 5MB. Not allowed.", false);
                                    } else {
                                        if (await uploadLogo({name, file, type: "TOOL"})) {
                                            setLogoCacheBust("" + Date.now());
                                        }
                                    }
                                    dialogStore.success();
                                }
                            }} />
                    </Button>

                    <Button
                        type="button"
                        color={themeColor("red")}
                        disabled={commandLoading}
                        onClick={async () => {
                            await invokeCommand(clearLogo({type: "TOOL", name}));
                            setLogoCacheBust("" + Date.now());
                        }}
                    >
                        Remove Logo
                    </Button>
                </VerticalButtonGroup>
            )}

            main={(
                <>
                    The following applications are currently using this tool, click on any to configure them further:

                    <Pagination.List
                        loading={apps.loading}
                        page={apps.data}
                        onPageChanged={newPage =>
                            fetchApps(
                                UCloud.compute.apps.findLatestByTool({tool: name, page: newPage, itemsPerPage: 50})
                            )
                        }

                        pageRenderer={page => (
                            <Flex justifyContent="center" flexWrap="wrap">
                                {page.items.map(({metadata}) => (
                                    <SmallAppToolCard
                                        key={`${metadata.name}/${metadata.version}`}
                                        to={`/applications/studio/a/${metadata.name}`}
                                    >
                                        <Flex>
                                            <AppToolLogo name={metadata.name} type={"APPLICATION"} />
                                            <Box ml={8}>
                                                <Truncate width={300} cursor={"pointer"}>
                                                    <b>
                                                        {metadata.title}
                                                    </b>
                                                </Truncate>
                                            </Box>
                                        </Flex>
                                    </SmallAppToolCard>
                                ))}
                            </Flex>
                        )}
                    />
                </>
            )}
        />
    );
};

export default Tool;
