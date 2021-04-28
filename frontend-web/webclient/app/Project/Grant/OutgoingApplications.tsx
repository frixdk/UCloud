import * as React from "react";
import {useEffect, useState} from "react";
import {useCloudAPI} from "Authentication/DataHook";
import {emptyPage} from "DefaultObjects";
import * as Heading from "ui-components/Heading";
import {List as PaginationList} from "Pagination";
import {MainContainer} from "MainContainer/MainContainer";
import {GrantApplication, GrantApplicationFilter, grantApplicationFilterPrettify, listOutgoingApplications} from ".";
import {GrantApplicationList} from "./IngoingApplications";
import {useTitle} from "Navigation/Redux/StatusActions";
import {SidebarPages, useSidebarPage} from "ui-components/Sidebar";
import VerticalButtonGroup from "ui-components/VerticalButtonGroup";
import {Box, Button, Flex, Label, Link} from "ui-components";
import {Center} from "UtilityComponents";
import {TextP} from "ui-components/Text";
import ClickableDropdown from "ui-components/ClickableDropdown";
import {styled} from "@linaria/react";

export const FilterTrigger = styled.div`
    user-select: none;
    display: inline-block;
    width: calc(100% - 30px);
`;

export const OutgoingApplications: React.FunctionComponent = () => {
    const [outgoingInvites, setParams] = useCloudAPI<Page<GrantApplication>>({noop: true}, emptyPage);
    const [filter, setFilter] = useState<GrantApplicationFilter>(GrantApplicationFilter.ACTIVE);
    useSidebarPage(SidebarPages.Projects);
    useTitle("Grant Applications");

    useEffect(() => {
        setParams(listOutgoingApplications({itemsPerPage: 25, page: 0, filter}));
    }, [filter]);

    return (
        <MainContainer
            headerSize={58}
            header={<Heading.h3>Grant Applications</Heading.h3>}
            sidebar={
                <VerticalButtonGroup>
                    <Link to={`/projects/browser/new`}><Button>Create Application</Button></Link>

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
                <PaginationList
                    loading={outgoingInvites.loading}
                    onPageChanged={(newPage, oldPage) =>
                        setParams(listOutgoingApplications({itemsPerPage: oldPage.itemsPerPage, page: newPage, filter}))}
                    page={outgoingInvites.data}
                    pageRenderer={pageRenderer}
                    customEmptyPage={
                        <Flex alignItems={"center"} justifyContent={"center"} height={"300px"}>
                            <Box maxWidth={700}>
                                <Box mb={16}>
                                    <TextP>
                                        You don&#39;t currently have any active outgoing applications for resources.
                                        In order to create a project, you must submit an application. Projects grant
                                        you the following benefits:

                                        <ul>
                                            <li>More resources for compute and storage</li>
                                            <li>A space to collaborate with other users</li>
                                        </ul>
                                    </TextP>
                                </Box>

                                <Center>
                                    <Link to={`/projects/browser/new`}><Button>Create Application</Button></Link>
                                </Center>
                            </Box>
                        </Flex>
                    }
                />
            }
        />
    );

    function pageRenderer(page: Page<GrantApplication>): JSX.Element {
        return <GrantApplicationList applications={page.items}/>;
    }
};

export default OutgoingApplications;
