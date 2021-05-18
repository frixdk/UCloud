import MainContainer from "MainContainer/MainContainer";
import {PaginationButtons} from "Pagination";
import {creditFormatter} from "Project/ProjectUsage";
import * as React from "react";
import styled from "styled-components";
import {Box, Button, Card, Flex, Icon, Input, Text} from "ui-components";
import {Spacer} from "ui-components/Spacer";
import Table, {TableCell, TableHeader, TableRow} from "ui-components/Table";
import {sizeToString} from "Utilities/FileUtilities";
import {getCssVar} from "Utilities/StyledComponentsUtilities";
import {Cell, Pie, PieChart} from "recharts";
import {ThemeColor} from "ui-components/theme";
import {useTitle} from "Navigation/Redux/StatusActions";
import ClickableDropdown from "ui-components/ClickableDropdown";
import * as UCloud from "UCloud";
import {useCloudAPI} from "Authentication/DataHook";
import {emptyPage} from "DefaultObjects";
import {UCLOUD_PROVIDER} from "Accounting";
import {prettierString} from "UtilityFunctions";

enum Selection {
    ACTIVE,
    ARCHIVED,
    ALL
}

const mockData = [
    {
        name: "Test",
        archived: false,
        computeCredits: 12312121212,
        storageCredits: 99542121212,
        computeUsage: [
            {name: "u2-standard", value: 160000000},
            {name: "u4-standard", value: 96000000},
            {name: "u3-standard", value: 96000000},
            {name: "u1-standard", value: 41000000}
        ],
        storageUsage: [],
        storageInSize: 12312789
    },
    {
        name: "Work",
        archived: true,
        computeCredits: 52312121212,
        storageCredits: 23912121212,
        computeUsage: [
            {name: "u2-standard", value: 160000000 * Math.random()},
            {name: "u4-standard", value: 96000000 * Math.random()},
            {name: "u3-standard", value: 96000000 * Math.random()},
            {name: "u1-standard", value: 41000000 * Math.random()}
        ],
        storageUsage: [],
        storageInSize: 52775121
    }
];

type ProductTypes = "STORAGE" | "COMPUTE" | "INGRESS" | "LICENSE" | "NETWORK_IP";

const Demo: React.FunctionComponent = () => {
    useTitle("Demo");

    const [selection, setSelection] = React.useState(Selection.ACTIVE);
    const [rowSelection, setRowSelection] = React.useState<string>("");

    const [area1, setArea1] = React.useState<ProductTypes>("COMPUTE");
    const [area2, setArea2] = React.useState<ProductTypes>("STORAGE");

    const [productArea1, fetchProductArea1] = useCloudAPI<UCloud.Page<UCloud.accounting.Product>>({noop: true}, emptyPage);
    const [productArea2, fetchProductArea2] = useCloudAPI<UCloud.Page<UCloud.accounting.Product>>({noop: true}, emptyPage);

    React.useEffect(() => {
        fetchProductArea1(UCloud.accounting.products.listProductionsByType({area: area1, provider: UCLOUD_PROVIDER, showHidden: true}));
    }, [area1]);

    React.useEffect(() => {
        fetchProductArea2(UCloud.accounting.products.listProductionsByType({area: area2, provider: UCLOUD_PROVIDER, showHidden: true}));
    }, [area2]);

    console.log(productArea1);
    console.log(productArea2);

    const page = mockData.filter(it => selection === Selection.ALL || ((selection === Selection.ACTIVE && it.archived === false)) || (it.archived && selection === Selection.ARCHIVED)).slice(0, 5);
    const remainingRows = 4 - page.length;
    const emptyRows: JSX.Element[] = [];
    if (!rowSelection) {
        for (let i = 0; i <= remainingRows; i++) {
            emptyRows.push(<TableRow style={{height: "74px"}} key={i}><TableCell /><TableCell /><TableCell /></TableRow>);
        }
    }

    return (
        <MainContainer
            main={<Box maxWidth="1200px">
                <Spacer
                    left={null}
                    right={
                        <Flex height="42px">
                            <Icon name="search" mt="7px" mr="-34px" size={28} color={getCssVar("gray")} />
                            <Input pl="32px" autoComplete="off" width="225px" />
                            <Button width="150px" ml="8px"><Text style={{fontWeight: 400}} fontSize="12px">Apply for resources</Text></Button>
                            <Button width="150px" ml="8px"><Text style={{fontWeight: 400}} fontSize="12px">New subproject</Text></Button>
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
                                {page.map(d => (
                                    <TableRow key={d.name} style={{height: "74px"}} onClick={() => setRowSelection(d.name)}>
                                        <TableCell>
                                            {d.name}
                                        </TableCell>
                                        <TableCell>
                                            <Flex my="-12px">
                                                <div style={{marginTop: "30px"}}>{creditFormatter(d.computeCredits)} (2.20% used)</div>
                                                <PieChart width={80} height={80}>
                                                    <Pie
                                                        data={d.computeUsage}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                        innerRadius={18}
                                                    >
                                                        {d.computeUsage.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={getCssVar(COLORS[index % COLORS.length])} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </Flex>
                                        </TableCell>
                                        <TableCell>
                                            <Spacer
                                                mr="24px"
                                                left={`${creditFormatter(d.storageCredits)} (5.99% used)`}
                                                right={`${sizeToString(d.storageInSize)}`}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {emptyRows}
                            </tbody>
                        </Table>
                        {!rowSelection ? null : (
                            <DetailedView>
                                <div>
                                    <Spacer
                                        mr="12px"
                                        mb="24px"
                                        left={null}
                                        right={<ClickableDropdown trigger={prettierString(area1)} chevron options={[]} onChange={() => undefined} />}
                                    />
                                    <Table style={{height: "auto", overflowY: "scroll"}}>
                                        {productArea1.data.items.map(p => (
                                            <ProductLine key={p.id}>
                                                <td style={{width: "40%"}}>
                                                    {p.id}
                                                </td>
                                                <td style={{width: "40%"}}>
                                                    {creditFormatter(p.balance ?? 0)} (X.Y% used)
                                                </td>
                                                <td style={{width: "20%"}}>
                                                    <Button><Icon size={12} name="edit" /></Button>
                                                </td>
                                            </ProductLine>
                                        ))}
                                    </Table>
                                </div>
                                <div>
                                    <Spacer
                                        mr="12px"
                                        mb="24px"
                                        left={null}
                                        right={<ClickableDropdown trigger={prettierString(area2)} chevron options={[]} onChange={() => undefined} />}
                                    />
                                    <Table style={{overflowY: "scroll"}}>
                                        {productArea2.data.items.map(p => (
                                            <ProductLine key={p.id}>
                                                <td width="40%">
                                                    {p.id}
                                                </td>
                                                <td width="40%">
                                                    {p.balance} (X.Y% used)
                                            </td>
                                                <td width="20%">
                                                    <Button><Icon size={12} name="edit" /></Button>
                                                </td>
                                            </ProductLine>
                                        ))}
                                    </Table>
                                </div>
                            </DetailedView>
                        )}
                    </Card>
                </BladedCard>
                <Spacer
                    left={null}
                    right={<PaginationButtons totalPages={1} currentPage={0} toPage={() => undefined} />}
                />
            </Box>}
        />
    );
};
const COLORS: [ThemeColor, ThemeColor, ThemeColor, ThemeColor, ThemeColor] = ["green", "red", "blue", "orange", "yellow"];

const ProductLine = styled.tr`
    border-bottom: 1px solid var(--midGray);
    padding-top: 12px;
    padding-bottom: 12px;
`;

const DetailedView = styled.div`
    display: flex;
    height: 338px;

    border-top: 1px solid var(--midGray);

    & > div {
        width: 50%;
        margin-left: 12px;
        margin-right: 12px;
    }

    & > div:first-child {
        border-right: 1px solid var(--midGray);
    }
`;

const BladedCard = styled.div`
    /* BLADES  */
    & > div:first-child {
        background-color: var(--white);
        display: flex;

        & > span {
            width: 90px;
            padding-bottom: 2px;
            padding-top: 2px;
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
