import * as React from "react";
import {useEffect} from "react";
import {MainContainer} from "MainContainer/MainContainer";
import {useCloudAPI} from "Authentication/DataHook";
import {
    GrantApplication,
    GrantApplicationFilter,
    grantApplicationFilterPrettify,
    GrantApplicationStatus,
    ingoingGrantApplications,
    IngoingGrantApplicationsResponse
} from "Project/Grant/index";
import {emptyPage} from "DefaultObjects";
import {useProjectManagementStatus} from "Project";
import * as Pagination from "Pagination";
import {ListRow, ListRowStat} from "ui-components/List";
import {Flex, Icon, Label, List, Text, Tooltip, Truncate, VerticalButtonGroup} from "ui-components";
import {creditFormatter} from "Project/ProjectUsage";
import {useAvatars} from "AvataaarLib/hook";
import {UserAvatar} from "AvataaarLib/UserAvatar";
import {defaultAvatar} from "UserSettings/Avataaar";
import {ProjectBreadcrumbs} from "Project/Breadcrumbs";
import {useHistory} from "react-router";
import {SidebarPages, useSidebarPage} from "ui-components/Sidebar";
import {dateToString} from "Utilities/DateUtilities";
import {IconName} from "ui-components/Icon";
import {ThemeColor} from "ui-components/theme";
import ClickableDropdown from "ui-components/ClickableDropdown";
import {FilterTrigger} from "./OutgoingApplications";
import {useRefreshFunction} from "Navigation/Redux/HeaderActions";
import {useDispatch} from "react-redux";
import {setLoading, useTitle} from "Navigation/Redux/StatusActions";

export const IngoingApplications: React.FunctionComponent = () => {
    const dispatch = useDispatch()

    const {projectId} = useProjectManagementStatus({isRootComponent: true});
    const [filter, setFilter] = React.useState<GrantApplicationFilter>(GrantApplicationFilter.ACTIVE);
    const [ingoingApplications, fetchIngoingApplications] = useCloudAPI<IngoingGrantApplicationsResponse>(
        {noop: true},
        emptyPage
    );

    useRefreshFunction(() => {
        fetchIngoingApplications(
            ingoingGrantApplications({
                itemsPerPage: 25,
                page: ingoingApplications.data.pageNumber,
                filter
            })
        );
    });

    useTitle("Ingoing Applications");

    useEffect(() => {
        fetchIngoingApplications(ingoingGrantApplications({itemsPerPage: 25, page: 0, filter}));
    }, [projectId, filter]);

    useEffect(() => {
        dispatch(setLoading(ingoingApplications.loading))
    }, [ingoingApplications.loading])

    useSidebarPage(SidebarPages.Projects);

    return <MainContainer
        header={<ProjectBreadcrumbs crumbs={[{title: "Ingoing Applications"}]} />}
        sidebar={<VerticalButtonGroup>
            <Label>Filter</Label>
            <ClickableDropdown
                chevron
                trigger={<FilterTrigger>{grantApplicationFilterPrettify(filter)}</FilterTrigger>}
                options={
                    Object
                        .keys(GrantApplicationFilter)
                        .map(it => ({
                            text: grantApplicationFilterPrettify(it as GrantApplicationFilter),
                            value: it
                        }))
                }
                onChange={(value: GrantApplicationFilter) => setFilter(value)}
            />
        </VerticalButtonGroup>
        }
        main={
            <Pagination.List
                page={ingoingApplications.data}
                loading={ingoingApplications.loading}
                onPageChanged={(newPage) => {
                    fetchIngoingApplications(ingoingGrantApplications({itemsPerPage: 25, page: newPage, filter}));
                }}
                pageRenderer={page => <GrantApplicationList applications={page.items} />}
            />
        }
    />;
};

export const GrantApplicationList: React.FunctionComponent<{
    applications: GrantApplication[],
    slim?: boolean
}> = ({applications, slim = false}) => {
    const history = useHistory();
    const avatars = useAvatars();
    useEffect(() => {
        avatars.updateCache(applications.map(it => it.requestedBy));
    }, [applications]);
    return (
        <List>
            {applications.map(app => {
                let icon: IconName;
                let iconColor: ThemeColor;
                switch (app.status) {
                    case GrantApplicationStatus.APPROVED:
                        icon = "check";
                        iconColor = "green";
                        break;
                    case GrantApplicationStatus.CLOSED:
                    case GrantApplicationStatus.REJECTED:
                        icon = "close";
                        iconColor = "red";
                        break;
                    case GrantApplicationStatus.IN_PROGRESS:
                        icon = "ellipsis";
                        iconColor = "black";
                        break;
                }

                return <ListRow
                    key={app.id}
                    navigate={() => history.push(`/project/grants/view/${app.id}`)}
                    icon={
                        slim ? null : (
                            <UserAvatar
                                avatar={avatars.cache[app.requestedBy] ?? defaultAvatar}
                                width={"45px"}
                            />
                        )
                    }
                    truncateWidth="230px"
                    left={
                        <Flex width={1}>
                            <Text title={app.grantRecipientTitle} mr={16}>
                                {app.grantRecipientTitle}
                            </Text>
                            {slim ? null : (
                                <Truncate>
                                    {/*
                                        Is small the correct tag to use here?
                                        Does it have the correct semantic meaning or should we just use
                                        <Text> with smaller font?
                                    */}
                                    <small>{app.document}</small>
                                </Truncate>
                            )}
                        </Flex>
                    }
                    right={(
                        <Tooltip
                            trigger={
                                <Flex width="auto" alignItems="center">
                                    <Flex flexGrow={1} justifyContent="flex-end">
                                        {creditFormatter(
                                            app.requestedResources.reduce(
                                                (prev, curr) => prev + (curr.creditsRequested ?? 0), 0
                                            ), 0)}
                                    </Flex>
                                    <Icon name={icon} color={iconColor} ml={8} />
                                </Flex>
                            }
                        >
                            Resource request in DKK
                        </Tooltip>
                    )}
                    leftSub={
                        <>
                            {slim ? null : (
                                <ListRowStat icon="calendar">{dateToString(app.createdAt)}</ListRowStat>
                            )}

                            <ListRowStat icon={"edit"}>
                                {dateToString(app.updatedAt)}
                            </ListRowStat>
                            <ListRowStat
                                icon={app.grantRecipient.type === "personal" ? "user" : "projects"}
                            >
                                {app.grantRecipient.type === "personal" ? "Personal" :
                                    app.grantRecipient.type === "new_project" ? "New project" :
                                        "Existing project"}
                            </ListRowStat>
                        </>
                    }
                />;
            })}
        </List>
    );
};

export default IngoingApplications;
