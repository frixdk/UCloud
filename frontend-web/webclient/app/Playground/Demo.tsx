import MainContainer from "MainContainer/MainContainer";
import * as React from "react";
import styled from "styled-components";
import {Button, Card, Flex, Icon, Input} from "ui-components";
import {Spacer} from "ui-components/Spacer";
import Table, {TableCell, TableHeader, TableHeaderCell, TableRow} from "ui-components/Table";

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
                            <Input width="150px" />
                            <Button width="350px" ml="8px">Apply for more resources</Button>
                            <Button ml="8px" width="230px">New subproject</Button>
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
