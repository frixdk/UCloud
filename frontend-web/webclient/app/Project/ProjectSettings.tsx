import * as React from "react";
import Divider from "ui-components/Divider";
import {
    fetchDataManagementPlan,
    FetchDataManagementPlanResponse,
    leaveProject,
    ProjectRole,
    renameProject,
    setProjectArchiveStatus,
    setProjectArchiveStatusBulk, updateDataManagementPlan,
    useProjectManagementStatus,
    UserInProject
} from "Project/index";
import {
    Box,
    Button,
    ButtonGroup,
    Flex,
    Input,
    Label,
    Text,
    TextArea,
    Checkbox,
    Icon,
    Grid
} from "ui-components";
import * as Heading from "ui-components/Heading";
import styled from "styled-components";
import {addStandardDialog} from "UtilityComponents";
import {callAPIWithErrorHandler, useAsyncCommand, useCloudAPI} from "Authentication/DataHook";
import {useHistory, useParams} from "react-router";
import {fileTablePage} from "Utilities/FileUtilities";
import {Client} from "Authentication/HttpClientInstance";
import {dialogStore} from "Dialog/DialogStore";
import {MainContainer} from "MainContainer/MainContainer";
import {ProjectBreadcrumbs} from "Project/Breadcrumbs";
import {GrantProjectSettings, LogoAndDescriptionSettings} from "Project/Grant/Settings";
import {useTitle} from "Navigation/Redux/StatusActions";
import {SidebarPages, useSidebarPage} from "ui-components/Sidebar";
import {snackbarStore} from "Snackbar/SnackbarStore";
import {Toggle} from "ui-components/Toggle";
import {useCallback, useEffect, useRef, useState} from "react";
import {TextSpan} from "ui-components/Text";
import {doNothing} from "UtilityFunctions";
import {
    AllowSubProjectsRenamingRequest,
    AllowSubProjectsRenamingResponse,
    externalApplicationsEnabled,
    ExternalApplicationsEnabledResponse,
    ToggleSubProjectsRenamingRequest
} from "Project/Grant";
import {buildQueryString} from "Utilities/URIUtilities";
import {DashboardCard} from "Dashboard/Dashboard";
import {SettingsBox} from "UserSettings/UserSettings";

const ActionContainer = styled.div`
    & > * {
        margin-bottom: 16px;
    }
`;

const ActionBox = styled.div`
    display: flex;
    margin-bottom: 16px;
    
    & > ${Box} {
        flex-grow: 1;
    }
    
    & > ${Flex} {
        margin-left: 8px;
        flex-direction: column;
        justify-content: center;
    }
    
    & > ${Flex} > ${Button} {
        min-width: 100px;
    }
`;

enum SettingsPage {
    GENERAL = "General",
    DMP = "DMP",
    GRANT_SETTINGS = "Grant",
    CARD_VIEW = "cards"
}

const HoverBox = styled(Box)`
    &:hover {
        transform: translateY(-2px);
    }
`;

export const ProjectSettings: React.FunctionComponent = () => {
    const {projectId, projectRole, projectDetails, projectDetailsParams, fetchProjectDetails, reloadProjectStatus} =
        useProjectManagementStatus({isRootComponent: true});
    const params = useParams<{page?: SettingsPage}>();
    const page = params.page ?? SettingsPage.CARD_VIEW;

    useTitle("Project Settings");
    useSidebarPage(SidebarPages.Projects);

    const history = useHistory();

    const [enabled, fetchEnabled] = useCloudAPI<ExternalApplicationsEnabledResponse>(
        {noop: true},
        {enabled: false}
    );

    useEffect(() => {
        fetchEnabled((externalApplicationsEnabled({projectId})));
    }, [projectId]);

    const crumbs: {title: string; link?: string}[] = [{title: "Settings", link: page !== SettingsPage.CARD_VIEW ? "/project/settings/" : undefined}]

    if (page !== SettingsPage.CARD_VIEW) {
        crumbs.push({title: page});
    }

    return (
        <MainContainer
            header={<ProjectBreadcrumbs crumbs={crumbs} />}
            main={
                <ActionContainer>
                    {page !== SettingsPage.CARD_VIEW ? null : (
                        <Grid
                            pt="20px"
                            gridGap="15px"
                            gridTemplateColumns="repeat(auto-fill, 400px)"
                            style={{gridAutoFlow: "row"}}
                        >
                            <HoverBox cursor="pointer">
                                <DashboardCard onClick={() => history.push(`/project/settings/${SettingsPage.GENERAL}`)} height="200px" width="400px" color="orange">
                                    <Flex>
                                        <Box height="100%" ml="-10px" mt="7px" width="30px">
                                            <Icon name="chrono" />
                                        </Box>
                                        <div>
                                            <Heading.h4 mt="7px">General</Heading.h4>
                                            <Text>
                                                - Project Title
                                            </Text>
                                            <Text>
                                                - Project Description
                                            </Text>
                                            <Text>
                                                - Rename Subprojects
                                            </Text>
                                            <Text>
                                                - Project Archival
                                            </Text>
                                            <Text>
                                                - Leave Project
                                            </Text>
                                        </div>
                                    </Flex>
                                </DashboardCard>
                            </HoverBox>
                            <HoverBox cursor="pointer">
                                <DashboardCard height="200px" width="400px" color="blue" onClick={() => history.push(`/project/settings/${SettingsPage.DMP}`)}>
                                    <Flex>
                                        <Box height="100%" ml="-10px" mt="7px" width="30px">
                                            <Icon name="chrono" />
                                        </Box>
                                        <div>
                                            <Heading.h4 mt="7px">Data Management Plan</Heading.h4>
                                            <Text>
                                                - Attach a Data Management Plan
                                            </Text>
                                        </div>
                                    </Flex>
                                </DashboardCard>
                            </HoverBox>
                            {!enabled.data.enabled ? null :
                                <HoverBox cursor="pointer">
                                    <DashboardCard height="200px" width="400px" color="green" onClick={() => history.push(`/project/settings/${SettingsPage.GRANT_SETTINGS}`)}>
                                        <Flex>
                                            <Box height="100%" ml="-10px" mt="7px" width="30px">
                                                <Icon name="mail" />
                                            </Box>
                                            <div>
                                                <Heading.h4 mt="7px">Grant Settings</Heading.h4>
                                                <Text>
                                                    - Access Control
                                                </Text>
                                                <Text>
                                                    - Automatic Approval
                                                </Text>
                                                <Text>
                                                    - Default Templates
                                                </Text>
                                            </div>
                                        </Flex>
                                    </DashboardCard>
                                </HoverBox>
                            }
                        </Grid>
                    )}
                    {page !== SettingsPage.GENERAL ? null : (
                        <>
                            <SettingsBox>
                                <ChangeProjectTitle
                                    projectId={projectId}
                                    projectDetails={projectDetails.data}
                                    onSuccess={() => {
                                        fetchProjectDetails(projectDetailsParams);
                                        reloadProjectStatus();
                                    }}
                                />
                                <SubprojectSettings
                                    projectId={projectId}
                                    projectRole={projectRole}
                                    setLoading={() => false}
                                />
                            </SettingsBox>
                            <SettingsBox>
                                <ArchiveSingleProject
                                    isArchived={projectDetails.data.archived}
                                    projectId={projectId}
                                    projectRole={projectRole}
                                    title={projectDetails.data.title}
                                    onSuccess={() => history.push("/projects")}
                                />
                            </SettingsBox>
                            <SettingsBox outline="red">
                                <LeaveProject
                                    onSuccess={() => history.push(fileTablePage(Client.homeFolder))}
                                    projectDetails={projectDetails.data}
                                    projectId={projectId}
                                    projectRole={projectRole}
                                />
                            </SettingsBox>
                            <LogoAndDescriptionSettings />
                        </>
                    )}
                    {page !== SettingsPage.DMP ? null : (
                        <SettingsBox>
                            <DataManagementPlan />
                        </SettingsBox>
                    )}
                    {page !== SettingsPage.GRANT_SETTINGS ? null : (
                        <GrantProjectSettings />
                    )}
                </ActionContainer>
            }
            sidebar={null}
        />
    );
};

interface ChangeProjectTitleProps {
    projectId: string;
    projectDetails: UserInProject;
    onSuccess: () => void;
}

const DataManagementPlan: React.FunctionComponent = () => {
    const [dmpResponse, fetchDmp] = useCloudAPI<FetchDataManagementPlanResponse>({noop: true}, {});
    const [, runWork] = useAsyncCommand();
    const projectManagement = useProjectManagementStatus({isRootComponent: false});
    const [hasDmp, setHasDmp] = useState<boolean>(false);
    const dmpRef = useRef<HTMLTextAreaElement>(null);

    const reload = (): void => {
        if (projectManagement.allowManagement && Client.hasActiveProject) {
            fetchDmp(fetchDataManagementPlan({}));
        }
    };

    useEffect(() => {
        reload();
    }, [projectManagement.projectId, projectManagement.allowManagement]);

    useEffect(() => {
        if (dmpResponse.data.dmp) {
            setHasDmp(true);
            if (dmpRef.current) {
                dmpRef.current.value = dmpResponse.data.dmp;
            }
        } else {
            setHasDmp(false);
            if (dmpRef.current) {
                dmpRef.current.value = "";
            }
        }
    }, [dmpResponse.data.dmp]);

    const updateDmp = useCallback(async () => {
        const res = await runWork(updateDataManagementPlan({
            id: projectManagement.projectId,
            dmp: dmpRef.current!.value
        }));
        if (res) {
            snackbarStore.addSuccess("Your data management plan has been updated", false);
        }
        reload();
    }, [projectManagement.projectId, runWork, dmpRef.current]);

    const deleteDmp = useCallback(async () => {
        addStandardDialog({
            title: "Confirm deleting data management plan",
            message: "",
            confirmText: "Delete",
            onCancel: doNothing,
            onConfirm: async () => {
                const res = await runWork(updateDataManagementPlan({id: projectManagement.projectId}));
                if (res) {
                    snackbarStore.addSuccess("Your data management plan has been updated", false);
                }
                reload();
            }
        });
    }, [projectManagement.projectId, runWork, dmpRef.current]);

    if (!Client.hasActiveProject || !projectManagement.allowManagement) return null;

    return <Box>
        If you have a data management plan then you can attach it to the project here.
        <TextSpan bold>
            You still need to follow your organization&apos;s policies regarding data management plans.
        </TextSpan>
        <br />

        <Label>
            Store a copy of this project&apos;s data management plan in UCloud?{" "}
            <Toggle onChange={() => {
                setHasDmp(!hasDmp);
            }} checked={hasDmp} scale={1.5} />
        </Label>

        {!hasDmp ? null : (
            <Box>
                <TextArea
                    placeholder={"Data management plan."}
                    rows={5}
                    width={"100%"}
                    ref={dmpRef}
                />
                <ButtonGroup mt={8}>
                    <Button type={"button"} onClick={updateDmp}>Save Data Management Plan</Button>
                    <Button type={"button"} onClick={deleteDmp} color={"red"}>Delete Data Management Plan</Button>
                </ButtonGroup>
            </Box>
        )}
    </Box>;
};

export const ChangeProjectTitle: React.FC<ChangeProjectTitleProps> = props => {
    const newProjectTitle = React.useRef<HTMLInputElement>(null);
    const [, invokeCommand] = useAsyncCommand();
    const [saveDisabled, setSaveDisabled] = React.useState<boolean>(true);

    const [allowRenaming, setAllowRenaming] = useCloudAPI<AllowSubProjectsRenamingResponse, AllowSubProjectsRenamingRequest>(
        {noop: true},
        {allowed: false}
    );

    useEffect(() => {
        setAllowRenaming(getRenamingStatus({projectId: props.projectId}))
    }, [props.projectId]);
    return (
        <Box flexGrow={1}>
            <form onSubmit={async e => {
                e.preventDefault();

                const titleField = newProjectTitle.current;
                if (titleField === null) return;

                const titleValue = titleField.value;

                if (titleValue === "") return;

                const success = await invokeCommand(renameProject(
                    {
                        id: props.projectId,
                        newTitle: titleValue
                    }
                )) !== null;

                if (success) {
                    props.onSuccess();
                    snackbarStore.addSuccess("Project renamed successfully", true);
                } else {
                    snackbarStore.addFailure("Renaming of project failed", true);
                }
            }}>
                <Heading.h4>Project Title</Heading.h4>
                <Flex flexGrow={1}>
                    <Box minWidth={500}>
                        <Input
                            rightLabel
                            required
                            mt="4px"
                            type="text"
                            ref={newProjectTitle}
                            placeholder="New project title"
                            autoComplete="off"
                            onChange={() => {
                                if (newProjectTitle.current?.value !== props.projectDetails.title) {
                                    setSaveDisabled(false);
                                } else {
                                    setSaveDisabled(true);
                                }
                            }}
                            defaultValue={props.projectDetails.title}
                            disabled={!allowRenaming.data.allowed}
                        />
                    </Box>
                    <Button
                        attached
                        disabled={saveDisabled}
                    >
                        Save
                        </Button>
                </Flex>
            </form>
        </Box>
    );
};

interface AllowRenamingProps {
    projectId: string;
    projectRole: ProjectRole
    setLoading: (loading: boolean) => void;
}

export function toggleRenaming(
    request: ToggleSubProjectsRenamingRequest
): APICallParameters<ToggleSubProjectsRenamingRequest> {
    return {
        method: "POST",
        path: "/projects/toggleRenaming",
        payload: request,
        reloadId: Math.random(),
    };
}

export function getRenamingStatusForSubProject(
    parameters: AllowSubProjectsRenamingRequest
): APICallParameters<AllowSubProjectsRenamingRequest> {
    return {
        method: "GET",
        path: buildQueryString(
            "/projects/renameable-sub",
            parameters
        ),
        parameters,
        reloadId: Math.random()
    };
}

export function getRenamingStatus(
    parameters: AllowSubProjectsRenamingRequest
): APICallParameters<AllowSubProjectsRenamingRequest> {
    return {
        method: "GET",
        path: buildQueryString(
            "/projects/renameable",
            parameters
        ),
        parameters,
        reloadId: Math.random()
    };
}

const SubprojectSettings: React.FC<AllowRenamingProps> = props => {
    const [allowRenaming, setAllowRenaming] = useCloudAPI<AllowSubProjectsRenamingResponse, AllowSubProjectsRenamingRequest>(
        {noop: true},
        {allowed: false}
    );

    useEffect(() => {
        props.setLoading(allowRenaming.loading);
        setAllowRenaming(getRenamingStatusForSubProject({projectId: props.projectId}));
    }, []);

    const toggleAndSet = async () => {
        await callAPIWithErrorHandler(toggleRenaming({projectId: props.projectId}));
        setAllowRenaming(getRenamingStatusForSubProject({projectId: props.projectId}));
    };

    return <>
        {props.projectRole === ProjectRole.USER ? null : (
            <Box flexGrow={1} mt="8px">
                <Label
                    fontWeight={"normal"}
                    fontSize={"2"}
                >
                    <Checkbox
                        size={24}
                        checked={allowRenaming.data.allowed}
                        onClick={() => toggleAndSet()}
                        onChange={() => undefined}
                    />
                    Allow subprojects to rename
                </Label>
            </Box>
        )}
    </>
}


interface ArchiveSingleProjectProps {
    isArchived: boolean;
    projectRole: ProjectRole;
    projectId: string;
    title: string;
    onSuccess: () => void;
}

export const ArchiveSingleProject: React.FC<ArchiveSingleProjectProps> = props => {
    return <>
        {props.projectRole === ProjectRole.USER ? null : (
            <div>
                <Box flexGrow={1}>
                    <Heading.h4>Project Archival</Heading.h4>
                    <Text>
                        {!props.isArchived ? null : (
                            <>
                                Unarchiving a project will reverse the effects of archival.
                                <ul>
                                    <li>
                                        Your projects will, once again, by visible to you and project
                                        collaborators
                                    </li>
                                    <li>This action <i>is</i> reversible</li>
                                </ul>
                            </>
                        )}
                        {props.isArchived ? null : (
                            <>
                                You can archive a project if it is no longer relevant for your day-to-day work.

                                <ul>
                                    <li>
                                        The project will, by default, be hidden for you and project
                                        collaborators
                                    </li>
                                    <li>No data will be deleted from the project</li>
                                    <li>This action <i>is</i> reversible</li>
                                </ul>
                            </>
                        )}
                    </Text>
                </Box>
                <Flex>
                    <Button
                        color="orange"
                        onClick={() => {
                            addStandardDialog({
                                title: "Are you sure?",
                                message: `Are you sure you wish to ` +
                                    `${props.isArchived ? "unarchive" : "archive"} ${props.title}?`,
                                onConfirm: async () => {
                                    const success = await callAPIWithErrorHandler(
                                        setProjectArchiveStatus({
                                            archiveStatus: !props.isArchived,
                                        }, props.projectId)
                                    );
                                    if (success) {
                                        props.onSuccess();
                                        dialogStore.success();
                                    }
                                },
                                addToFront: true,
                                confirmText: `${props.isArchived ? "Unarchive" : "Archive"} project`
                            });
                        }}
                    >
                        {props.isArchived ? "Unarchive" : "Archive"}
                    </Button>
                </Flex>
            </div>
        )}
    </>;
};

interface ArchiveProjectProps {
    projects: UserInProject[]
    onSuccess: () => void;
}

export const ArchiveProject: React.FC<ArchiveProjectProps> = props => {
    const multipleProjects = props.projects.length > 1;
    const archived = props.projects.every(it => it.archived);
    let projectTitles = "";
    props.projects.forEach(project =>
        projectTitles += project.title + ","
    );
    const anyUserRoles = props.projects.some(it => it.whoami.role === ProjectRole.USER);
    projectTitles = projectTitles.substr(0, projectTitles.length - 1);
    return <>
        {anyUserRoles ? null : (
            <ActionBox>
                <Box flexGrow={1}>
                    <Heading.h4>Project Archival</Heading.h4>
                    <Text>
                        {!archived ? null : (
                            <>
                                Unarchiving {multipleProjects ? "projects" : "a project"} will reverse the effects of
                                archival.
                                <ul>
                                    <li>
                                        Your project{multipleProjects ? "s" : ""} will, once again, be visible to you
                                        and project
                                        collaborators
                                    </li>
                                    <li>This action <i>is</i> reversible</li>
                                </ul>
                            </>
                        )}
                        {archived ? null : (
                            <>
                                You can archive {multipleProjects ? "projects" : "a project"} if it is no longer
                                relevant for your day-to-day work.

                                <ul>
                                    <li>
                                        The project{multipleProjects ? "s" : ""} will, by default, be hidden for you and
                                        project
                                        collaborators
                                    </li>
                                    <li>No data will be deleted from the project{multipleProjects ? "s" : ""}</li>
                                    <li>This action <i>is</i> reversible</li>
                                </ul>
                            </>
                        )}
                    </Text>
                </Box>
                <Flex>
                    <Button
                        color={"orange"}
                        onClick={() => {
                            addStandardDialog({
                                title: "Are you sure?",
                                message: `Are you sure you wish to ` +
                                    `${archived ? "unarchive" : "archive"} ${projectTitles}?`,
                                onConfirm: async () => {
                                    const success = await callAPIWithErrorHandler(
                                        setProjectArchiveStatusBulk({
                                            projects: props.projects,
                                        })
                                    );
                                    if (success) {
                                        props.onSuccess();
                                        dialogStore.success();
                                    }
                                },
                                addToFront: true,
                                confirmText: `${archived ? "Unarchive" : "Archive"} project${multipleProjects ? "s" : ""}`
                            });
                        }}
                    >
                        {archived ? "Unarchive" : "Archive"}
                    </Button>
                </Flex>
            </ActionBox>
        )}
    </>;
};

interface LeaveProjectProps {
    projectRole: ProjectRole;
    projectId: string;
    projectDetails: UserInProject;
    onSuccess: () => void;
}

export const LeaveProject: React.FC<LeaveProjectProps> = props => {
    return (
        <Box flexGrow={1}>
            <Heading.h4>Leave Project</Heading.h4>
            <Text>
                If you leave the project the following will happen:

                    <ul>
                    <li>
                        All files and compute resources owned by the project become
                        inaccessible to you
                        </li>

                    <li>
                        None of your files in the project will be deleted
                        </li>

                    <li>
                        Project administrators can recover files from your personal directory in
                        the project
                        </li>
                </ul>
            </Text>

            {props.projectRole !== ProjectRole.PI ? null : (
                <Text>
                    <b>You must transfer the principal investigator role to another member before
                            leaving the project!</b>
                </Text>
            )}
            <Button
                mt="4px"
                color="red"
                disabled={props.projectRole === ProjectRole.PI}
                onClick={() => {
                    addStandardDialog({
                        title: "Are you sure?",
                        message: `Are you sure you wish to leave ${props.projectDetails.title}?`,
                        onConfirm: async () => {
                            const success = await callAPIWithErrorHandler(leaveProject({}, props.projectId));
                            if (success) {
                                props.onSuccess();
                                dialogStore.success();
                            }
                        },
                        confirmText: "Leave project",
                        addToFront: true
                    });
                }}
            >
                Leave
            </Button>
        </Box>
    );
};

export default ProjectSettings;
