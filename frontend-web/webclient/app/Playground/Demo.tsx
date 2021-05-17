import MainContainer from "MainContainer/MainContainer";
import * as React from "react";
import styled from "styled-components";
import {Button, Card, Flex, Icon, Input, Text} from "ui-components";
import {Spacer} from "ui-components/Spacer";
import Table, {TableCell, TableHeader, TableRow} from "ui-components/Table";
import {getCssVar} from "Utilities/StyledComponentsUtilities";

enum Selection {
    ACTIVE,
    ARCHIVED,
    ALL
}

const mockData = [

]

const Demo: React.FunctionComponent = () => {
    const [selection, setSelection] = React.useState(Selection.ACTIVE);
    return (
        <MainContainer
            main={<>

                <Spacer
                    left={null}
                    right={
                        <Flex height="42px">
                            <Icon name="search" mt="7px" mr="-34px" size={28} color={getCssVar("gray")} />
                            <Input pl="32px" autoComplete="off" width="225px" />
                            <Button ml="8px"><Text style={{fontWeight: 400}} fontSize="12px">Apply for resources</Text></Button>
                            <Button ml="8px"><Text style={{fontWeight: 400}} fontSize="12px">New subproject</Text></Button>
                        </Flex>
                    }
                />
                <BladedCard>
                    <div>
                        <span onClick={() => setSelection(Selection.ACTIVE)} data-active={selection === Selection.ACTIVE}>Active</span>
                        <span onClick={() => setSelection(Selection.ARCHIVED)} data-active={selection === Selection.ARCHIVED}>Archived</span>
                        <span onClick={() => setSelection(Selection.ALL)} data-active={selection === Selection.ALL}>All</span>
                        <div />
                    </div>
                    <Card>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <th style={{textAlign: "left"}}>
                                        Name
                                    </th>
                                    <th style={{textAlign: "left"}}>
                                        {/* Clickable dropdown? */}
                                        <Icon ml="-48px" mr="20px" name="cpu" color="black" /> Compute
                                    </th>
                                    <th style={{textAlign: "left"}}>
                                        {/* Clickable dropdown? */}
                                        <Icon ml="-48px" mr="20px" name="ftFileSystem" color="black" /> Storage
                                    </th>
                                </TableRow>
                            </TableHeader>
                            <tbody>
                                <TableRow>
                                    <TableCell>
                                        Test
                                    </TableCell>
                                    <TableCell>
                                        0 DKK (0.00% used)
                                    </TableCell>
                                    <TableCell>
                                        <Spacer
                                            mr="24px"
                                            left={<>0 DKK (0.00% used)</>}
                                            right={<>5.24 MB</>}
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>
                                        Work
                                    </TableCell>
                                    <TableCell>
                                        0 DKK (0.00% used)
                                    </TableCell>
                                    <TableCell>
                                        <Spacer
                                            mr="24px"
                                            left={<>0 DKK (0.00% used)</>}
                                            right={<>5.24 MB</>}
                                        />
                                    </TableCell>
                                </TableRow>
                            </tbody>
                        </Table>
                    </Card>
                </BladedCard>
            </>}
        />
    );
};

const BladedCard = styled.div`
    /* BLADES  */
    & > div:first-child {
        background-color: var(--white);
        display: flex;

        & > span {
            width: 90px;
            padding-bottom: 2px;
            margin-top: 8px;
            cursor: pointer;
            padding-left: 4px;
            padding-right: 4px;
            border-right: 0px;
            border: solid 1px var(--midGray);
            color: var(--midGray);
            text-align: center;
        }

        & > span[data-active=true] {
            border-bottom: 0px;
            color: var(--blue);
        }

        & > span:last-child {
            border-right: solid 1px var(--midGray);
            margin-right: auto;
        }

        & > div:last-child {
            width: 100%;
            border-bottom: 1px solid var(--midGray);
            background-color: unset;
        }

        & > div {
            display: flex;
        }
    }

    /* CARD */
    & > ${Card} {
        border-top: 0px;
    }

    & > ${Card} > table > thead > tr > th, & > ${Card} > table > tbody > tr > td {
        padding-left: 8px;
    }

    & > ${Card} > table > thead > tr, & > ${Card} > table > tbody > tr {
        height: 45px;
    }
`;

export default Demo;
