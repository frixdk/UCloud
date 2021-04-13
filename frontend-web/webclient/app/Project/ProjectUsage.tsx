import {APICallState, useCloudAPI} from "Authentication/DataHook";
import {MainContainer} from "MainContainer/MainContainer";
import * as Heading from "ui-components/Heading";
import * as React from "react";
import {useEffect, useState} from "react";
import {Box, Button, Card, Flex, Icon, Input, Link, Relative, Text, theme} from "ui-components";
import {connect} from "react-redux";
import {Dispatch} from "redux";
import {setRefreshFunction} from "Navigation/Redux/HeaderActions";
import {loadingAction} from "Loading";
import {dispatchSetProjectAction} from "Project/Redux";
import {Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import Table, {TableCell, TableHeader, TableHeaderCell, TableRow} from "ui-components/Table";
import {
    ProductArea,
    productAreaTitle,
    retrieveBalance,
    RetrieveBalanceResponse,
    retrieveQuota,
    RetrieveQuotaResponse,
    transformUsageChartForCharting,
    transformUsageChartForTable,
    usage,
    UsageResponse
} from "Accounting";
import {useProjectManagementStatus} from "Project";
import {ProjectBreadcrumbs} from "Project/Breadcrumbs";
import styled from "styled-components";
import {ThemeColor} from "ui-components/theme";
import ClickableDropdown from "ui-components/ClickableDropdown";
import {Client} from "Authentication/HttpClientInstance";
import {getCssVar} from "Utilities/StyledComponentsUtilities";
import {useTitle} from "Navigation/Redux/StatusActions";
import {useSidebarPage, SidebarPages} from "ui-components/Sidebar";
import {Dropdown} from "ui-components/Dropdown";
import {capitalized} from "UtilityFunctions";
import Grid from "ui-components/Grid";
import {HighlightedCard} from "Dashboard/Dashboard";
import {Spacer} from "ui-components/Spacer";
import {useHistory, useRouteMatch} from "react-router";
import {PaginationButtons} from "Pagination";
import * as UCloud from "UCloud";
import {emptyPage} from "DefaultObjects";
import {computeUsageInPeriod} from "./ProjectDashboard";
import {sizeToString} from "Utilities/FileUtilities";

function dateFormatter(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1} ` +
        `${date.getHours().toString().padStart(2, "0")}:` +
        `${date.getMinutes().toString().padStart(2, "0")}`;
}

function dateFormatterDay(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1} `;
}

function dateFormatterMonth(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getFullYear()} `;
}

function getDateFormatter(duration: Duration): (timestamp: number) => string {
    switch (duration.text) {
        case "Past 14 days":
        case "Past 30 days":
        case "Past 180 days":
            return dateFormatterDay;
        case "Past 365 days":
            return dateFormatterMonth;
        case "Past 7 days":
        case "Today":
        default:
            return dateFormatter;
    }
}

export function creditFormatter(credits: number, precision = 2): string {
    if (precision < 0 || precision > 6) throw Error("Precision must be in 0..6");

    // Edge-case handling
    if (credits < 0) {
        return "-" + creditFormatter(-credits);
    } else if (credits === 0) {
        return "0 DKK";
    } else if (credits < Math.pow(10, 6 - precision)) {
        if (precision === 0) return "< 1 DKK";
        let builder = "< 0,";
        for (let i = 0; i < precision - 1; i++) builder += "0";
        builder += "1 DKK";
        return builder;
    }

    // Group into before and after decimal separator
    const stringified = credits.toString().padStart(6, "0");

    let before = stringified.substr(0, stringified.length - 6);
    let after = stringified.substr(stringified.length - 6);
    if (before === "") before = "0";
    if (after === "") after = "0";
    after = after.padStart(precision, "0");
    after = after.substr(0, precision);

    // Truncate trailing zeroes (but keep at least two)
    if (precision > 2) {
        let firstZeroAt = -1;
        for (let i = 2; i < after.length; i++) {
            if (after[i] === "0") {
                if (firstZeroAt === -1) firstZeroAt = i;
            } else {
                firstZeroAt = -1;
            }
        }

        if (firstZeroAt !== -1) { // We have trailing zeroes
            after = after.substr(0, firstZeroAt);
        }
    }

    // Thousand separator
    const beforeFormatted = addThousandSeparators(before);

    if (after === "") return `${beforeFormatted} DKK`;
    else return `${beforeFormatted},${after} DKK`;
}

export function addThousandSeparators(numberOrString: string | number): string {
    const numberAsString = typeof numberOrString === "string" ? numberOrString : numberOrString.toString(10);
    let result = "";
    const chunksInTotal = Math.ceil(numberAsString.length / 3);
    let offset = 0;
    for (let i = 0; i < chunksInTotal; i++) {
        if (i === 0) {
            let firstChunkSize = numberAsString.length % 3;
            if (firstChunkSize === 0) firstChunkSize = 3;
            result += numberAsString.substr(0, firstChunkSize);
            offset += firstChunkSize;
        } else {
            result += '.';
            result += numberAsString.substr(offset, 3);
            offset += 3;
        }
    }
    return result;
}

interface Duration {
    text: string;
    bucketSize: number;
    bucketSizeText: string;
    timeInPast: number;
}

export const durationOptions: Duration[] = [
    {
        text: "Today",
        bucketSize: 1000 * 60 * 60,
        bucketSizeText: "every hour",
        timeInPast: 1000 * 60 * 60 * 24
    },
    {
        text: "Past week",
        bucketSize: 1000 * 60 * 60 * 12,
        bucketSizeText: "every 12 hours",
        timeInPast: 1000 * 60 * 60 * 24 * 7
    },
    {
        text: "Past 14 days",
        bucketSize: 1000 * 60 * 60 * 24,
        bucketSizeText: "every day",
        timeInPast: 1000 * 60 * 60 * 24 * 14
    },
    {
        text: "Past 30 days",
        bucketSize: 1000 * 60 * 60 * 24 * 2,
        bucketSizeText: "every other day",
        timeInPast: 1000 * 60 * 60 * 24 * 30
    },
    {
        text: "Past 180 days",
        bucketSize: 1000 * 60 * 60 * 24 * 14,
        bucketSizeText: "every other week",
        timeInPast: 1000 * 60 * 60 * 24 * 180
    },
    {
        text: "Past 365 days",
        bucketSize: 1000 * 60 * 60 * 24 * 30,
        bucketSizeText: "every 30 days",
        timeInPast: 1000 * 60 * 60 * 24 * 365
    },
];

const UsageHeader = styled(Flex)`
    ${Dropdown} {
        flex-shrink: 0;
    }
`;

const ProjectUsage: React.FunctionComponent<ProjectUsageOperations> = props => {
    const {projectId, reload} = useProjectManagementStatus({isRootComponent: true, allowPersonalProject: true});

    useTitle("Usage");
    useSidebarPage(SidebarPages.Projects);

    const [productArea, setProductArea] = useState<ProductArea>("COMPUTE");
    const [durationOption, setDurationOption] = useState<Duration>(durationOptions[3]);

    const currentTime = new Date();
    const now = periodStartFunction(currentTime, durationOption);

    const [balance, fetchBalance, balanceParams] = useCloudAPI<RetrieveBalanceResponse>(
        retrieveBalance({includeChildren: true}),
        {wallets: []}
    );

    const [usageResponse, setUsageParams, usageParams] = useCloudAPI<UsageResponse>(
        usage({
            bucketSize: durationOption.bucketSize,
            periodStart: now - durationOption.timeInPast,
            periodEnd: now
        }),
        {charts: []}
    );

    useEffect(() => {
        setUsageParams(usage({
            bucketSize: durationOption.bucketSize,
            periodStart: now - durationOption.timeInPast,
            periodEnd: now
        }));
    }, [durationOption]);

    useEffect(() => {
        props.setRefresh(() => {
            reload();
            setUsageParams({...usageParams, reloadId: Math.random()});
            fetchBalance({...balanceParams, reloadId: Math.random()});
        });
        return () => props.setRefresh();
    }, [reload]);

    return (
        <MainContainer
            header={
                <Box minWidth={600} width="80%" mt={30} marginLeft="auto" marginRight="auto">
                    <UsageHeader>
                        <ProjectBreadcrumbs allowPersonalProject crumbs={[{title: "Usage"}]} />
                        <ClickableDropdown
                            trigger={
                                <BorderedFlex width="180px">
                                    <Heading.h4 ml="8px">{durationOption.text}</Heading.h4>
                                    <Icon mr="4px" ml="auto" name="chevronDown" size={16} />
                                </BorderedFlex>
                            }
                            onChange={opt => setDurationOption(durationOptions[opt])}
                            options={durationOptions.map((it, idx) => ({text: it.text, value: idx}))}
                        />
                    </UsageHeader>
                </Box>
            }
            sidebar={null}
            main={
                <Box minWidth={600} width="80%" mt={30} marginLeft="auto" marginRight="auto">
                    <UsageVisualization durationOption={durationOption} />
                </Box>
            }
        />
    );
};

interface ValueNamePair {
    value: number;
    name: string;
}

const pieChartData: ValueNamePair[] = [{value: Math.random() * 400, name: "a1-standard"}, {value: Math.random() * 400, name: "u1-standard"}, {value: Math.random() * 400, name: "u1-gpu"}, {value: Math.random() * 400, name: "u1-storage"}];
const pieChartData2: ValueNamePair[] = [{value: Math.random() * 400, name: "u1-standard-64"}, {value: Math.random() * 400, name: "u1-standard-1"}, {value: Math.random() * 400, name: "u1-standard-2"}, {value: Math.random() * 400, name: "u1-standard-16"}];

function UsageVisualization({durationOption}: {durationOption: Duration}) {
    const {field} = useRouteMatch<{field?: string}>().params;
    const history = useHistory();

    const [balance, fetchBalance, balanceParams] = useCloudAPI<RetrieveBalanceResponse>(
        retrieveBalance({includeChildren: true}),
        {wallets: []}
    );


    const currentTime = new Date();
    const now = periodStartFunction(currentTime, durationOption);

    const [usageResponse, fetchUsageParams, usageParams] = useCloudAPI<UsageResponse>(
        {noop: true},
        {charts: []}
    );

    const [subprojects, fetchSubprojects] = useCloudAPI<Page<UCloud.project.Project>>({
        noop: true
    }, emptyPage);

    const [quota, fetchQuotaParams, quotaParams] = useCloudAPI<RetrieveQuotaResponse>(
        {noop: true},
        {
            quotaInBytes: 0,
            quotaInTotal: 0,
        }
    );

    React.useEffect(() => {
        fetchSubprojects(UCloud.project.listSubProjects({
            itemsPerPage: 100,
            page: 0
        }));
        fetchQuotaParams(retrieveQuota({
            path: Client.activeHomeFolder,
            includeUsage: true
        }));
        fetchUsageParams(usage({
            bucketSize: durationOption.bucketSize,
            periodStart: now - durationOption.timeInPast,
            periodEnd: now
        }));
    }, [durationOption, Client.projectId]);

    const [projects, fetchProjects, projectParams] = useCloudAPI<Page<UCloud.project.UserProjectSummary>>(
        UCloud.project.listProjects({
            archived: true,
            itemsPerPage: 100,
            noFavorites: false,
            page: 0,
            showAncestorPath: true
        }),
        emptyPage
    );

    if (field) return <DetailedView data={subprojects.data} />;

    const computeCharts = usageResponse.data.charts.map(it => transformUsageChartForCharting(it, "COMPUTE"));
    const computeCreditsRemaining = balance.data.wallets.filter(it => it.area === "COMPUTE").filter(it => it.wallet.id === Client.projectId).reduce((acc, it) => it.allocated + acc, 0);

    const computeCreditsUsedInPeriod = computeUsageInPeriod(computeCharts);
    const storageCharts = usageResponse.data.charts.map(it => transformUsageChartForCharting(it, "STORAGE"));
    const storageCreditsUsedInPeriod = computeUsageInPeriod(storageCharts);

    const activeProject = Client.hasActiveProject ? projects.data.items.find(p => p.projectId === Client.projectId ?? "") : undefined;
    const activeWorkspace = activeProject ? activeProject.ancestorPath! + "/" + activeProject.title : Client.username!;

    // Fill timestamps;
    const usageComputeData = usageResponse.data.charts[0]?.lines.filter(it => it.projectId === Client.projectId && it.area === "COMPUTE")[0]?.points.map(it => ({time: it.timestamp})) ?? [];
    const subProjectNames = subprojects.data.items.map(it => ({title: it.title, id: it.id}));

    for (const chart of usageResponse.data.charts) {
        for (const line of chart.lines.filter(it => it.projectId === Client.projectId)) {
            for (const [i, point] of line.points.entries()) {
                if (usageComputeData[i] === undefined) break;
                usageComputeData[i][line.projectPath!] = point.creditsUsed;
            }
        }
    }

    const computeEntries = Object.keys(usageComputeData[0] ?? {}).filter(it => it !== "time");

    const subProjectsUsage = balance.data.wallets.filter(it => it.wallet.type === (Client.hasActiveProject ? "PROJECT" : "USER") && it.wallet.id !== (Client.hasActiveProject ? Client.projectId : Client.username));
    const subprojjes: ValueNamePair[] = [];
    for (const wallet of subProjectsUsage) {
        const subprojectTitle = subProjectNames.find(it => it.id === wallet.wallet.id)?.title ?? "";
        const index = subprojjes.findIndex(it => it.name === subprojectTitle);
        if (index === -1) {
            subprojjes.push({name: subprojectTitle, value: wallet.used});
        } else {
            subprojjes[index].value += wallet.used;
        }
    }

    return (
        <Grid px="auto" style={{gap: "30px 30px", justifyContent: "center", alignContent: "center"}} gridTemplateColumns="435px 435px">
            <HighlightedCard px={0} height="437px" color="green">
                {/* Storage */}
                <Spacer
                    left={
                        <Box ml="8px">
                            <Text color="gray">Storage</Text>
                            <Text bold my="-6px" fontSize="24px">{sizeToString(quota.data.quotaUsed ?? 0)} used</Text>
                            <Text fontSize="14px">Remaining {sizeToString(quota.data.quotaInBytes)}</Text>
                        </Box>
                    }
                    right={
                        <ClickableDropdown
                            trigger={<Box mr="4px" mt="4px"><Icon rotation={90} name="ellipsis" /></Box>}
                            left="-110px"
                            top="-4px"
                            options={[{text: "Storage (GB)", value: "storage_gb"}, {text: "Storage (DKK)", value: "storage_price"}, {text: "Compute (DKK)", value: "compute"}]}
                            onChange={it => console.log(it)}
                        />
                    }
                />
                {storageCharts[0]?.points.length === 0 ? <NoEntries /> : <ResponsiveContainer height={360}>
                    <AreaChart
                        margin={{
                            left: 0,
                            top: 4,
                            right: 0,
                            bottom: -28
                        }}
                        style={{cursor: "pointer"}}
                        onClick={() => history.push(`/project/usage/storage`)}
                        data={storageCharts[0]?.points ?? []}
                    >
                        <XAxis dataKey="time" />
                        <Tooltip labelFormatter={getDateFormatter(durationOption)} formatter={sizeToString} />
                        <Area type="linear" opacity={1} dataKey={activeWorkspace} strokeWidth="2px" stroke={getCssVar("darkBlue")} fill={getCssVar("blue")} />
                    </AreaChart>
                </ResponsiveContainer>}
            </HighlightedCard>
            <HighlightedCard px={0} height="437px" color="green">
                {/* Compute */}
                <Spacer
                    left={
                        <Box ml="8px">
                            <Text color="gray">Compute</Text>
                            <Text bold my="-6px" fontSize="24px">{creditFormatter(computeCreditsUsedInPeriod)} used</Text>
                            <Text fontSize="14px">Remaining {creditFormatter(computeCreditsRemaining)}</Text>
                        </Box>
                    }
                    right={
                        <ClickableDropdown
                            trigger={<Box mr="4px" mt="4px"><Icon rotation={90} name="ellipsis" /></Box>}
                            left="-111px"
                            top="-4px"
                            options={[{text: "Storage (GB)", value: "storage_gb"}, {text: "Storage (DKK)", value: "storage_price"}, {text: "Compute (DKK)", value: "compute"}]}
                            onChange={it => console.log(it)}
                        />
                    }
                />
                {computeEntries.length === 0 ? <NoEntries /> : <ResponsiveContainer height={360}>
                    <AreaChart
                        margin={{
                            left: 0,
                            top: 4,
                            right: 0,
                            bottom: -28
                        }}
                        onClick={() => history.push("/project/usage/compute")}
                        style={{cursor: "pointer"}}
                        data={usageComputeData}
                    >
                        <XAxis dataKey="time" />
                        <Tooltip labelFormatter={getDateFormatter(durationOption)} formatter={creditFormatter} />
                        {computeEntries.map((it, index) =>
                            <Area
                                key={index}
                                type="linear"
                                opacity={0.8}
                                dataKey={it}
                                strokeWidth="2px"
                                stroke={getCssVar(("dark" + capitalized(COLORS[index % COLORS.length]) as ThemeColor))}
                                fill={getCssVar(COLORS[index % COLORS.length])}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>}
            </HighlightedCard>
            {["STORAGE", "COMPUTE"].map(area => {
                const byArea = balance.data.wallets.filter(it => it.area === area && it.wallet.type === (Client.hasActiveProject ? "PROJECT" : "USER") && it.wallet.id === (Client.hasActiveProject ? Client.projectId : Client.username));
                const data = byArea.map(it => ({name: it.wallet.paysFor.id, value: it.used}));
                return (
                    <DonutChart key={area} data={data} area={area} />
                )
            })}
            {/* TODO */}
            <DonutChart area="Subprojects" data={subprojjes} />
            <DonutChart area="Capacity" data={[{value: quota.data.quotaInTotal, name: "Capacity"}, {value: quota.data.quotaUsed ?? 0, name: "Used"}]} />
        </Grid>
    );
}

function NoEntries() {
    return <Flex mt="40px" justifyContent="center">
        <Text color="gray" fontSize="24px">
            No usage found
        </Text>
    </Flex>
}

const COLORS: [ThemeColor, ThemeColor, ThemeColor, ThemeColor, ThemeColor] = ["green", "red", "blue", "orange", "yellow"];

function DonutChart({area, data}: {area: string; data: ValueNamePair[]}): JSX.Element | null {
    const totalUsage = data.reduce((acc, it) => it.value + acc, 0);
    return (
        <HighlightedCard height="auto" key={area} color="green">
            <Flex>
                <Box mr="auto" />
                <ClickableDropdown
                    trigger={<Box mr="-14px" mt="2px"><Icon rotation={90} name="ellipsis" /></Box>}
                    left="-112px"
                    top="-4px"
                    options={[{text: "Storage (GB)", value: "storage_gb"}, {text: "Storage (DKK)", value: "storage_price"}, {text: "Compute (DKK)", value: "compute"}]}
                    onChange={it => console.log(it)}
                />
            </Flex>
            <Flex><Box mr="auto" /><Text fontSize="26px">{capitalized(area)}</Text><Box ml="auto" /></Flex>
            {data.length === 0 ? <NoEntries /> :
                <>
                    <Flex>
                        <Box mr="auto" />
                        <PieChart key={area} width={300} height={300}>
                            <Pie
                                data={data}
                                fill="#8884d8"
                                dataKey="value"
                                innerRadius={80}
                            >
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={getCssVar(COLORS[index % COLORS.length])} />
                                ))}
                            </Pie>
                        </PieChart>
                        <Box ml="auto" />
                    </Flex>
                    <Flex pb="12px">
                        <Box mr="auto" />
                        {data.map((it, index) =>
                            <Box mx="auto" key={it.name}>
                                <Text textAlign="center" fontSize="14px">{it.name}</Text>
                                <Text
                                    textAlign="center"
                                    color={getCssVar(COLORS[index % COLORS.length])}
                                >
                                    {toPercentageString(it.value / (totalUsage !== 0 ? totalUsage : 1))}
                                </Text>
                            </Box>
                        )}
                        <Box ml="auto" />
                    </Flex>
                </>
            }
        </HighlightedCard>
    )
}

const mockSubprojects = [{
    name: "Foo/Bar/Baz",
    data: pieChartData,
    mostUsed: "u2-cephfs",
    balanceUsed: 500_000_000,
    balanceRemaining: 1_000_000_000,
}, {
    name: "Qux/Quaz/Quxx",
    data: pieChartData2,
    mostUsed: "u1-cephfs",
    balanceUsed: 500_000_000,
    balanceRemaining: 1_000_000_000,
}];

function DetailedView({data}: {data: Page<UCloud.project.Project>}): JSX.Element | null {
    const searchRef = React.useRef<HTMLInputElement>(null);
    const [selected, setSelected] = React.useState("");
    const subprojects = selected ? [data.items.find(it => it.title === selected)!] : data.items;
    const selectedIndex = data.items.findIndex(it => it.title === selected);
    const totalUsage = !selected ? 0 : mockSubprojects[selectedIndex].data.reduce((acc, element) => acc + element.value, 0);
    return (
        <>
            <Spacer
                left={
                    <>
                        <RoundedDropdown initialSelection="Storage" options={["Storage", "Compute"]} />
                        <RoundedDropdown initialSelection="Past 30 Days" options={["Today", "Last week", "Past 30 days", "Past year"]} />
                    </>
                }
                right={
                    <>
                        <BorderedFlex height="38px" width="36px">
                            <Icon ml="2px" name="download" />
                        </BorderedFlex>
                        <Input pl="32px" autoComplete="off" style={{height: "38px", border: "1px solid var(--usageGray)"}} ref={searchRef} width="200px" />
                        <Relative left="-198px">
                            <Icon size="32px" mt="4px" name="search" color="gray" />
                        </Relative>
                    </>
                }
            />
            <Box my="30px" width="100%" borderRadius="4px" style={{border: "2px solid var(--usageGray)"}}>
                <Table>
                    <TableHeader style={{marginLeft: "10px", marginRight: "10px", borderBottom: "1px solid var(--usageGray)", borderRadius: "6px"}}>
                        <TableRow>
                            <TableHeaderCell style={{paddingLeft: "12px"}} textAlign="left">
                                Subproject
                            </TableHeaderCell>
                            <TableHeaderCell textAlign="left">
                                Product breakdown
                            </TableHeaderCell>
                            <TableHeaderCell textAlign="left">
                                Most used product
                            </TableHeaderCell>
                            <TableHeaderCell textAlign="left">
                                Balance used
                            </TableHeaderCell>
                            <TableHeaderCell textAlign="left">
                                Balance remaining
                            </TableHeaderCell>
                            <TableHeaderCell textAlign="left">
                                Active
                            </TableHeaderCell>
                        </TableRow>
                    </TableHeader>
                    <tbody>
                        {data.items.map((it, index) => {
                            return (
                                <BorderedTableRow onClick={() => setSelected(s => s ? "" : it.title)} key={it.id}>
                                    <td style={{paddingLeft: "12px"}}>{it.title}</td>
                                    <td>
                                        <Box pl="auto" pr="auto">
                                            <PieChart width={80} height={80}>
                                                <Pie
                                                    data={mockSubprojects[index % mockSubprojects.length].data}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    innerRadius={18}
                                                >
                                                    {mockSubprojects[index % mockSubprojects.length].data.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={getCssVar(COLORS[index % COLORS.length])} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </Box>
                                    </td>
                                    <td>{mockSubprojects[index % mockSubprojects.length].mostUsed}</td>
                                    <td>{creditFormatter(mockSubprojects[index % mockSubprojects.length].balanceUsed)}</td>
                                    <td>{creditFormatter(mockSubprojects[index % mockSubprojects.length].balanceRemaining)}</td>
                                    <td><Icon name="check" color="green" /></td>
                                </BorderedTableRow>
                            )
                        })}
                    </tbody>
                </Table>
                {!selected ? null :
                    <Flex style={{borderTop: "1px solid var(--usageGray)"}}>
                        <Box width="33%">
                            <Box ml="calc(50% - 150px)">
                                <PieChart width={300} height={300}>
                                    <Pie
                                        data={mockSubprojects[selectedIndex].data}
                                        fill="#8884d8"
                                        dataKey="value"
                                        innerRadius={80}
                                    >
                                        {mockSubprojects[selectedIndex].data.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={getCssVar(COLORS[index % COLORS.length])} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </Box>
                        </Box>
                        <Box width="33%" mt="30px">
                            <Grid style={{gap: "10px 20px"}} gridTemplateColumns="auto auto">
                                {mockSubprojects[selectedIndex].data.map((it, index) =>
                                    <Box key={it.name}>
                                        <Text textAlign="center" fontSize="14px">{it.name}</Text>
                                        <Text
                                            textAlign="center"
                                            color={getCssVar(COLORS[index % COLORS.length])}
                                        >
                                            {toPercentageString(it.value / totalUsage)}
                                        </Text>
                                    </Box>
                                )}
                            </Grid>
                        </Box>
                        <Box width="34%" style={{borderLeft: "1px solid var(--usageGray)"}}>
                            <FixedHeightFlex>
                                <Text pl="12px" m="auto" width="60%">Number of members</Text> <Text m="auto" width="40%">{"10 members"}</Text>
                            </FixedHeightFlex>
                            <FixedHeightFlex>
                                <Text pl="12px" m="auto" width="60%">Number of groups</Text> <Text m="auto" width="40%">{"5 groups"}</Text>
                            </FixedHeightFlex>
                            <FixedHeightFlex>
                                <Text pl="12px" my="auto"><Link color="blue" to="/">Grant Application</Link></Text>
                            </FixedHeightFlex>
                            <FixedHeightFlex>
                                <Text pl="12px" m="auto" width="60%">Data management plan</Text> <Text m="auto" width="40%"><Link to="/">Yes</Link></Text>
                            </FixedHeightFlex>
                            <FixedHeightFlex>
                                <Text m="auto" width="60%">{/* ??? */}</Text>
                            </FixedHeightFlex>
                        </Box>
                    </Flex>
                }
            </Box>
            <Spacer
                left={null}
                right={<PaginationButtons totalPages={10} currentPage={2} toPage={() => undefined} />}
            />
        </>
    );
}

const FixedHeightFlex = styled(Flex)`
    &:not(:last-child) {
                        border - bottom: 1px solid var(--usageGray);
    }
    height: 20%;
    margin: auto;
`;

const BorderedTableRow = styled(TableRow)`
    cursor: pointer;
    &:not(:last-child) {
                        border - bottom: 1px solid var(--usageGray);
    }
`;

function RoundedDropdown({initialSelection, options}: {initialSelection: string, options: string[]}): JSX.Element {
    const [selection, setSelection] = React.useState(initialSelection);

    return (
        <ClickableDropdown
            trigger={
                <BorderedFlex width="180px">
                    <Text fontSize="19px" ml="6px" color="black" mr={8}>{selection}</Text>
                    <Icon name="chevronDown" size={12} />
                </BorderedFlex>}
        >
            {options.map(it => <Text key={it} onClick={() => setSelection(it)}>{it}</Text>)}
        </ClickableDropdown>
    )
}

const BorderedFlex = styled(Flex) <{width: string}>`
    height: 38px;
    margin-right: 15px;
    width: ${p => p.width};
    border: 1px solid var(--usageGray);
    border-radius: 4px;
    align-items: center;
`;


function toPercentageString(value: number) {
    return `${Math.round(value * 10_000) / 100} %`
}

const VisualizationForArea: React.FunctionComponent<{
    area: ProductArea,
    projectId: string,
    usageResponse: APICallState<UsageResponse>,
    balance: APICallState<RetrieveBalanceResponse>,
    durationOption: Duration
}> = ({area, projectId, usageResponse, balance, durationOption}) => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const charts = usageResponse.data.charts.map(it => transformUsageChartForCharting(it, area));

    const remainingBalance = balance.data.wallets.filter(it => it.area === area).reduce((sum, wallet) => {
        if (wallet.wallet.type === "PROJECT" && wallet.wallet.id === projectId) return sum + wallet.balance;
        if (wallet.wallet.type === "USER" && wallet.wallet.id === Client.username) return sum + wallet.balance;
        else return sum;
    }, 0);

    const balanceAllocatedToChildren = balance.data.wallets.reduce((sum, wallet) => {
        if (wallet.area === area && wallet.wallet.id !== projectId) return sum + wallet.balance;
        else return sum;
    }, 0);

    // provider -> lineName -> usage
    const creditsUsedByWallet: Record<string, Record<string, number>> = {};
    let creditsUsedInPeriod = 0;

    for (const chart of charts) {
        const usageByCurrentProvider: Record<string, number> = {};
        creditsUsedByWallet[chart.provider] = usageByCurrentProvider;

        for (const point of chart.points) {
            for (const category of Object.keys(point)) {
                if (category === "time") continue;

                const currentUsage = usageByCurrentProvider[category] ?? 0;
                usageByCurrentProvider[category] = currentUsage + point[category];
                creditsUsedInPeriod += point[category];
            }
        }
    }

    const tableCharts = usageResponse
        .data
        .charts
        .map(it => transformUsageChartForTable(projectId, it, area, balance.data.wallets, expanded));

    return (
        <Box>
            <SummaryCard
                title={productAreaTitle(area)}
                balance={remainingBalance}
                creditsUsed={creditsUsedInPeriod}
                allocatedToChildren={balanceAllocatedToChildren}
            />

            <Box m={35}>
                {charts.map(chart => (
                    <React.Fragment key={chart.provider}>
                        {chart.lineNames.length === 0 ? null : (
                            <>
                                <Heading.h5>Usage {durationOption.bucketSizeText} for {durationOption.text.toLowerCase()} (Provider: {chart.provider})</Heading.h5>
                                <Box mt={20} mb={20}>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart
                                            syncId="someId"
                                            data={chart.points}
                                            margin={{
                                                top: 10, right: 30, left: 0, bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" tickFormatter={getDateFormatter(durationOption)} />
                                            <YAxis width={150} tickFormatter={creditFormatter} />
                                            <Tooltip
                                                labelFormatter={getDateFormatter(durationOption)}
                                                formatter={n => creditFormatter(n as number, 2)}
                                                offset={64}
                                            />
                                            {chart.lineNames
                                                .map((id, idx) =>
                                                    <Bar
                                                        key={id}
                                                        dataKey={id}
                                                        fill={theme.chartColors[idx % theme.chartColors.length]}
                                                        barSize={24}
                                                    />
                                                )
                                            }
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>

                                <Flex flexDirection={"row"} justifyContent={"center"}>
                                    {chart.lineNames.map((line, idx) =>
                                        <Flex key={idx} mx={"16px"} flexDirection={"row"}>
                                            <Box
                                                width={20}
                                                height={20}
                                                mr={"8px"}
                                                backgroundColor={theme.chartColors[idx % theme.chartColors.length]}
                                            />
                                            {line}
                                        </Flex>
                                    )}
                                </Flex>
                            </>
                        )}
                    </React.Fragment>
                ))}

                {tableCharts.map(chart =>
                    <Box key={chart.provider} mb={40}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHeaderCell width={30} />
                                    <TableHeaderCell />
                                    <TableHeaderCell textAlign="right">
                                        Credits Used In Period
                                    </TableHeaderCell>
                                </TableRow>
                            </TableHeader>
                            <tbody>
                                {chart.projects.map((p, idx) => {
                                    const isExpanded = expanded.has(p.projectTitle);
                                    const result = [
                                        <TableRow key={p.projectTitle}>
                                            <TableCell>
                                                <Box width={20} height={20}
                                                    backgroundColor={idx > 3 ? theme.chartColors[4] : theme.chartColors[idx % theme.chartColors.length]} />
                                            </TableCell>
                                            <TableCell>
                                                {p.projectTitle}
                                                <Button ml="6px" width="6px" height="16px"
                                                    onClick={() => onExpandOrDeflate(p.projectTitle)}>{isExpanded ? "-" : "+"}</Button>
                                            </TableCell>
                                            <TableCell textAlign="right">
                                                {creditFormatter(p.totalUsage)}
                                            </TableCell>
                                        </TableRow>
                                    ];
                                    if (isExpanded) {
                                        for (const category of p.categories) {
                                            result.push(<TableRow key={category.product}>
                                                <TableCell>
                                                    <Box ml="20px" pl="6px" width={20} height={20}
                                                        backgroundColor={idx > 3 ? theme.chartColors[4] : theme.chartColors[idx % theme.chartColors.length]} />
                                                </TableCell>
                                                <TableCell><Text pl="20px">{category.product}</Text></TableCell>
                                                <TableCell textAlign="right">
                                                    {creditFormatter(category.usage)}
                                                </TableCell>
                                            </TableRow>);
                                        }
                                    }
                                    return result;
                                })}
                            </tbody>
                        </Table>
                    </Box>
                )}
            </Box>
        </Box>
    );

    function onExpandOrDeflate(p: string): void {
        if (expanded.has(p)) {
            setExpanded(new Set((expanded.delete(p), expanded)));
        } else {
            setExpanded(new Set([...expanded, p]));
        }
    }
};


const SummaryStat = styled.figure`
    flex-grow: 1;
    text-align: center;
    margin: 0;

    figcaption {
                                    display: block;
        color: var(--gray, #ff0);
        text-transform: uppercase;
        font-size: 12px;
    }
`;

const SummaryWrapper = styled(Card)`
    display: flex;
    padding: 15px;
    margin: 0 15px;
    align-items: center;

    h4 {
                                    flex - grow: 2;
    }
`;

const PercentageDisplay: React.FunctionComponent<{
    numerator: number,
    denominator: number,
    // Note this must be sorted ascending by breakpoint
    colorRanges: {breakpoint: number, color: ThemeColor}[]
}> = props => {
    if (props.denominator === 0) {
        return null;
    }

    const percentage = (props.numerator / props.denominator) * 100;
    let color: ThemeColor = "black";
    for (const cRange of props.colorRanges) {
        if (percentage >= cRange.breakpoint) {
            color = cRange.color;
        }
    }

    return <Text as="span" color={getCssVar(color)}>({percentage.toFixed(2)}%)</Text>;
};

const SummaryCard: React.FunctionComponent<{
    title: string,
    creditsUsed: number,
    balance: number,
    allocatedToChildren: number
}> = props => (
    <SummaryWrapper>
        <Heading.h4>{props.title}</Heading.h4>
        <SummaryStat>
            {creditFormatter(props.creditsUsed)}
            <figcaption>Credits used in period</figcaption>
        </SummaryStat>
        <SummaryStat>
            {creditFormatter(props.balance)}
            <figcaption>Credits remaining</figcaption>
        </SummaryStat>
        {Client.hasActiveProject ? <SummaryStat>
            {creditFormatter(props.allocatedToChildren)}{" "}
            <PercentageDisplay
                numerator={props.allocatedToChildren}
                denominator={props.balance}
                colorRanges={[
                    {breakpoint: 80, color: "green"},
                    {breakpoint: 100, color: "yellow"},
                    {breakpoint: 175, color: "red"}
                ]}
            />
            <figcaption>Allocated to subprojects</figcaption>
        </SummaryStat> : null}
    </SummaryWrapper>
);

interface ProjectUsageOperations {
    setRefresh: (refresh?: () => void) => void;
    setLoading: (loading: boolean) => void;
    setActiveProject: (project: string) => void;
}

const mapDispatchToProps = (dispatch: Dispatch): ProjectUsageOperations => ({
    setRefresh: refresh => dispatch(setRefreshFunction(refresh)),
    setLoading: loading => dispatch(loadingAction(loading)),
    setActiveProject: project => dispatchSetProjectAction(dispatch, project),
});

export default connect(null, mapDispatchToProps)(ProjectUsage);

function periodStartFunction(time: Date, duration: Duration): number {
    switch (duration.text) {
        case "Today":
            return new Date(
                time.getFullYear(),
                time.getMonth(),
                time.getDate(),
                time.getHours() + 1,
                0,
                0
            ).getTime();
        case "Past week":
            return new Date(
                time.getFullYear(),
                time.getMonth(),
                time.getDate(),
                time.getHours() + 1,
                0,
                0
            ).getTime();
        case "Past 14 days":
            return new Date(
                time.getFullYear(),
                time.getMonth(),
                time.getDate() + 1,
                0,
                0,
                0
            ).getTime();
        case "Past 30 days":
            return new Date(
                time.getFullYear(),
                time.getMonth(),
                time.getDate() + 1,
                0,
                0,
                0
            ).getTime();
        case "Past 180 days":
            return new Date(
                time.getFullYear(),
                time.getMonth(),
                time.getDate() + 1,
                0,
                0,
                0
            ).getTime();
        case "Past 365 days":
            return new Date(
                time.getFullYear(),
                time.getMonth(),
                time.getDate() + 1,
                0,
                0,
                0
            ).getTime();
        default:
            return time.getTime();
    }
}
