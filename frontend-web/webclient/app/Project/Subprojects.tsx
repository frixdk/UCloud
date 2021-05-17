import {useCloudAPI, useCloudCommand} from "Authentication/DataHook";
import {MainContainer} from "MainContainer/MainContainer";
import {createProject, listSubprojects, Project, renameProject, useProjectManagementStatus} from "Project";
import * as React from "react";
import {useCallback, useEffect, useRef, useState} from "react";
import {Box, Button, ButtonGroup, Card, Flex, Icon, Input, Label, Link, List, Text, Tooltip} from "ui-components";
import styled from "styled-components";
import {emptyPage, emptyPageV2} from "DefaultObjects";
import {errorMessageOrDefault} from "UtilityFunctions";
import {snackbarStore} from "Snackbar/SnackbarStore";
import {ProjectBreadcrumbs} from "Project/Breadcrumbs";
import * as Pagination from "Pagination";
import * as Heading from "ui-components/Heading";
import {
    isQuotaSupported,
    productCategoryEquals,
    retrieveBalance,
    RetrieveBalanceResponse, retrieveQuota, RetrieveQuotaResponse, setCredits, updateQuota,
    WalletBalance, walletEquals
} from "Accounting";
import {creditFormatter} from "Project/ProjectUsage";
import {HighlightedCard} from "Dashboard/Dashboard";
import HexSpin, {HexSpinWrapper} from "LoadingIcon/LoadingIcon";
import {Client} from "Authentication/HttpClientInstance";
import {sizeToString} from "Utilities/FileUtilities";
import {isAdminOrPI} from "Utilities/ProjectUtilities";
import {useTitle} from "Navigation/Redux/StatusActions";
import {useSidebarPage, SidebarPages} from "ui-components/Sidebar";
import {Balance} from "Accounting/Balance";
import {NamingField, shakeAnimation, shakingClassName} from "UtilityComponents";
import {Spacer} from "ui-components/Spacer";
import {ListRow} from "ui-components/List";
import {getRenamingStatusForSubProject} from "./ProjectSettings";
import * as UCloud from "UCloud";
import {accounting, PageV2} from "UCloud";
import Product = accounting.Product;

const WalletContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, auto));
  grid-gap: 32px;

  margin: 32px 0;

  & > * {
    min-height: 145px;
  }

  ${shakeAnimation}
`;

const SelectableWalletWrapper = styled.div`
  ${Card} {
    cursor: pointer;
    min-width: 350px;
    transition: all 0.25s ease-out;
    width: 100%;
    height: 100%;
  }

  &.selected ${Card} {
    background-color: var(--lightBlue, #f00);
    transform: translate3d(0, -10px, 0);
  }

  &:hover ${Card} {
    background-color: var(--lightGray, #f00);
  }

  th {
    margin-right: 8px;
    text-align: left;
  }

  td {
    text-align: right;
    width: 100%;
  }

  table {
    margin: 8px;
  }
`;


const SelectableWallet: React.FunctionComponent<{
    wallet: WalletBalance,
    allocated?: number,
    selected?: boolean,
    onClick?: () => void,
    quotaInTotal?: number,
    usage?: number,
    remainingQuota?: number
}> = props => {
    return (
        <SelectableWalletWrapper className={props.selected === true ? "selected" : ""} onClick={props.onClick}>
            <HighlightedCard color={props.selected ? "green" : "blue"} isLoading={false}>
                <table>
                    <tbody>
                        <tr>
                            <th>Product</th>
                            <td>{props.wallet.wallet.paysFor.provider} / {props.wallet.wallet.paysFor.id}</td>
                        </tr>
                        <tr>
                            <th>Balance</th>
                            <td>
                                <Balance amount={props.wallet.balance} productCategory={props.wallet.wallet.paysFor} />
                            </td>
                        </tr>
                        {!props.allocated ? null : (
                            <tr>
                                <th>Allocated</th>
                                <td>{creditFormatter(props.allocated)}</td>
                            </tr>
                        )}
                        {props.quotaInTotal === undefined ? null : (
                            <tr>
                                <th>Used/Quota</th>
                                <td>{sizeToString(props.usage ?? 0)}
                                    {" "}/{" "}
                                    {sizeToString(props.remainingQuota!)}
                                    {" "}({(100 * (props.remainingQuota ?
                                        ((props.usage ?? 0) / props.remainingQuota) : 1
                                    )).toFixed(2)}%)
                            </td>
                            </tr>
                        )}
                        <tr>
                            <th />
                            <td>
                                <Icon
                                    color2={props.wallet.area === "COMPUTE" ? undefined : "white"}
                                    name={
                                        props.wallet.area === "COMPUTE" ? "cpu" :
                                            props.wallet.area === "STORAGE" ? "ftFileSystem" :
                                                props.wallet.area === "LICENSE" ? "license" :
                                                    props.wallet.area === "INGRESS" ? "favIcon" :
                                                        "info"
                                    }
                                    size={32}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </HighlightedCard>
        </SelectableWalletWrapper>
    );
};

const Subprojects: React.FunctionComponent = () => {
    const [, runCommand] = useCloudCommand();

    useTitle("Resources");
    useSidebarPage(SidebarPages.Projects);

    const {
        projectId,
        allowManagement,
        subprojectSearchQuery,
        projectRole,
    } = useProjectManagementStatus({isRootComponent: true, allowPersonalProject: true});

    const [quota, fetchQuota] = useCloudAPI<RetrieveQuotaResponse>(
        {noop: true},
        {quotaInBytes: 0, quotaInTotal: 0}
    );

    const [wallets, setWalletParams] = useCloudAPI<RetrieveBalanceResponse>(
        {noop: true},
        {wallets: []}
    );

    const [products, fetchProducts] = useCloudAPI<PageV2<Product>>({noop: true}, emptyPageV2);

    const reloadWallets = useCallback(() => {
        setWalletParams(retrieveBalance({includeChildren: true}));
        fetchQuota(retrieveQuota(
            {
                path: Client.hasActiveProject ? Client.currentProjectFolder : Client.homeFolder,
                includeUsage: true
            }));
        fetchProducts(UCloud.accounting.products.browse({itemsPerPage: 250, includeBalance: true, filterUsable: true}));
    }, [setWalletParams, projectId]);

    const [creatingSubproject, setCreatingSubproject] = useState(false);
    const createSubprojectRef = useRef<HTMLInputElement>(null);

    const [selectedWallet, setSelectedWallet] = useState<WalletBalance | null>(null);
    const walletContainer = useRef<HTMLDivElement>(null);
    const shakeWallets = useCallback(() => {
        const container = walletContainer.current;
        if (container) {
            container.classList.add(shakingClassName);
            window.setTimeout(() => {
                container.classList.remove(shakingClassName);
            }, 820);
        }
    }, [walletContainer.current]);

    const projectWallets = wallets.data.wallets.filter(it => it.wallet.id === projectId);
    const personalWallets = wallets.data.wallets.filter(it => !Client.hasActiveProject && it.wallet.id === Client.username);
    const mainWallets = [...projectWallets, ...personalWallets];
    const subprojectWallets = wallets.data.wallets.filter(it =>
        it.wallet.id !== projectId &&
        selectedWallet !== null && productCategoryEquals(it.wallet.paysFor, selectedWallet.wallet.paysFor)
    );

    const [subprojects, setSubprojectParams, subprojectParams] = useCloudAPI<Page<Project>>(
        listSubprojects({itemsPerPage: 50, page: 0}),
        emptyPage
    );

    const reloadSubprojects = (): void => {
        setSubprojectParams({...subprojectParams});
    };

    async function createSubproject(e: React.SyntheticEvent): Promise<void> {
        e.preventDefault();
        try {
            const subprojectName = createSubprojectRef.current?.value ?? "";
            if (!subprojectName) {
                snackbarStore.addFailure("Project name can't be empty", false);
                return;
            }

            await runCommand(createProject({
                title: subprojectName,
                parent: projectId
            }));

            snackbarStore.addSuccess(`Subproject created`, true);
            createSubprojectRef.current!.value = "";
            setCreatingSubproject(false);
            setSubprojectParams({...subprojectParams});
        } catch (err) {
            snackbarStore.addFailure(errorMessageOrDefault(err, "Failed to create project."), false);
        }
    }

    useEffect(() => {
        reloadSubprojects();
        reloadWallets();
    }, [projectId]);

    return (
        <MainContainer
            header={<ProjectBreadcrumbs allowPersonalProject crumbs={[{title: "Resource Allocation"}]} />}
            sidebar={null}
            main={(
                <>
                    <Spacer
                        left={<Heading.h3>Resources</Heading.h3>}
                        right={
                            !isAdminOrPI(projectRole) ? null : (
                                <Link to={
                                    !Client.hasActiveProject ?
                                        "/projects/browser/personal" :
                                        "/project/grants/existing"
                                }>
                                    <Button>Apply for resources</Button>
                                </Link>
                            )
                        }
                    />
                    <LoadingBox height="233px" isLoading={wallets.loading}>
                        <WalletContainer ref={walletContainer}>
                            {mainWallets.length === 0 ?
                                isAdminOrPI(projectRole) ? null :
                                    <Heading.h4>No resources attached to project. Contact project PI.</Heading.h4>
                                : <>{mainWallets.map((w, i) => {
                                    const extraProps = !isQuotaSupported(w.wallet.paysFor) ? ({}) : ({
                                        quotaInTotal: quota.data.quotaInTotal,
                                        usage: quota.data.quotaUsed,
                                        remainingQuota: quota.data.quotaInBytes
                                    });

                                    const isFreeButRequireBalance = products.data.items.some(it =>
                                        "paymentModel" in it &&
                                        it.paymentModel === "FREE_BUT_REQUIRE_BALANCE" &&
                                        productCategoryEquals(w.wallet.paysFor, it.category)
                                    );

                                    if (isFreeButRequireBalance) return null;

                                    return <SelectableWallet
                                        key={i}
                                        wallet={w}
                                        selected={selectedWallet !== null && walletEquals(selectedWallet.wallet, w.wallet)}
                                        allocated={
                                            wallets.data.wallets.reduce((prev, it) => (
                                                it.wallet.id !== projectId && productCategoryEquals(w.wallet.paysFor, it.wallet.paysFor) ?
                                                    prev + it.balance : prev
                                            ), 0)
                                        }
                                        onClick={() => Client.hasActiveProject ? setSelectedWallet(w) : null}
                                        {...extraProps}
                                    />;
                                }
                                )}</>
                            }

                            {(!Client.hasActiveProject || isAdminOrPI(projectRole)) && mainWallets.length === 0 ?
                                <HighlightedCard color="blue" isLoading={false}>
                                    <Flex height={"140px"} justifyContent={"center"} alignItems={"center"}
                                        flexDirection={"column"}>
                                        <Heading.h4>No resources available for this project</Heading.h4>
                                        <Box mt={16}>
                                            <Link to={
                                                !Client.hasActiveProject ?
                                                    "/projects/browser/personal" :
                                                    "/project/grants/existing"
                                            }><Button>Apply for resources</Button></Link>
                                        </Box>
                                    </Flex>
                                </HighlightedCard>
                                : null}
                        </WalletContainer>
                    </LoadingBox>

                    {!Client.hasActiveProject ? null : <>
                        {isAdminOrPI(projectRole) ? <>
                            <Spacer
                                left={
                                    <Heading.h3>Subprojects</Heading.h3>
                                }
                                right={
                                    <Button height="40px" onClick={() => setCreatingSubproject(true)}>New
                                        Subproject</Button>
                                }
                            />
                            <Box className="subprojects" maxWidth={850} ml="auto" mr="auto">
                                <Box ml={8} mr={8}>
                                    <Box mt={20}>
                                        {creatingSubproject ? (
                                            <NamingField
                                                confirmText="Create"
                                                onSubmit={createSubproject}
                                                onCancel={() => setCreatingSubproject(false)}
                                                inputRef={createSubprojectRef}
                                            />
                                        ) : null}
                                        <Pagination.List
                                            page={subprojects.data}
                                            pageRenderer={pageRenderer}
                                            loading={subprojects.loading}
                                            onPageChanged={newPage => {
                                                setSubprojectParams(
                                                    listSubprojects({
                                                        page: newPage,
                                                        itemsPerPage: 50,
                                                    })
                                                );
                                            }}
                                            customEmptyPage={
                                                <Flex justifyContent="center" alignItems="center" height="200px">
                                                    This project doesn&apos;t have any subprojects.
                                                    {isAdminOrPI(projectRole) ? <> You can create one by using
                                                        the &apos;New Subproject&apos; button above.</> : ""}
                                                </Flex>
                                            }
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </> : null}
                    </>}
                </>
            )}
        />
    );

    function pageRenderer(page: Page<Project>): JSX.Element {
        const filteredItems = (subprojectSearchQuery === "" ? page.items :
            page.items.filter(it =>
                it.title.toLowerCase()
                    .search(subprojectSearchQuery.toLowerCase().replace(/\W|_|\*/g, "")) !== -1
            )
        );

        return (
            <List>
                {filteredItems.map(subproject =>
                    <SubprojectRow
                        key={subproject.id}
                        subproject={subproject}
                        shakeWallets={shakeWallets}
                        requestReload={reloadWallets}
                        reloadSubprojects={reloadSubprojects}
                        walletBalance={selectedWallet === null ?
                            undefined :
                            subprojectWallets.find(it => it.wallet.id === subproject.id) ??
                            {
                                ...selectedWallet,
                                balance: 0,
                                allocated: 0,
                                used: 0,
                                wallet: {...selectedWallet.wallet, id: subproject.id}
                            }
                        }
                        allowManagement={allowManagement}
                    />
                )}
            </List>
        );
    }
};

const AllocationEditor = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin: 0 16px;

  ${Input} {
    width: 150px;
    flex-grow: 1;
    padding-top: 0;
    padding-bottom: 0;
    text-align: right;
  }

  ${HexSpinWrapper} {
    margin: -12px 0 0 10px;
  }
`;

const AllocationForm = styled.form`
  display: flex;
  align-items: flex-end;
`;

const LoadingBox = (props: React.PropsWithChildren<{height: string; isLoading: boolean}>): JSX.Element => {
    if (props.isLoading) return <Flex alignItems="center" minHeight={props.height}><HexSpin /></Flex>;
    else return <>{props.children}</>;
};

const SubprojectRow: React.FunctionComponent<{
    subproject: Project,
    walletBalance?: WalletBalance,
    shakeWallets?: () => void,
    requestReload?: () => void,
    reloadSubprojects?: () => void,
    allowManagement: boolean
}> = ({subproject, walletBalance, shakeWallets, requestReload, allowManagement, reloadSubprojects}) => {
    const balance = walletBalance?.balance;
    const used = walletBalance?.used ?? 0;
    const allocated = walletBalance?.allocated ?? 0;
    const percentageUsed = allocated === 0 ? 0 : (used / allocated) * 100;
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isEditingName, setEditingName] = useState(false);
    const [isEditingQuota, setIsEditingQuota] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const subprojectRenamingRef = useRef<HTMLInputElement>(null);
    const quotaRef = useRef<HTMLInputElement>(null);
    const [loading, runCommand] = useCloudCommand();
    const [canRename, fetchCanRename] = useCloudAPI<{allowed: boolean}>({noop: true}, {allowed: false});
    const [quota, fetchQuota, quotaParams] = useCloudAPI<RetrieveQuotaResponse>(
        getRenamingStatusForSubProject({projectId: subproject.id}),
        {quotaInBytes: 0, quotaInTotal: 0}
    );
    const quotaInTotal = walletBalance && isQuotaSupported(walletBalance.wallet.paysFor) ?
        quota.data.quotaInTotal : undefined;

    useEffect(() => {
        if (walletBalance && isQuotaSupported(walletBalance.wallet.paysFor)) {
            fetchQuota(retrieveQuota({path: `/projects/${subproject.id}`}));
        }

        fetchCanRename(getRenamingStatusForSubProject({projectId: subproject.id}));
    }, [subproject.id, walletBalance?.wallet?.paysFor?.id, walletBalance?.wallet?.paysFor?.provider]);

    const onSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (loading) return; // Silently fail
        if (balance === undefined || !walletBalance) {
            snackbarStore.addFailure("UCloud is not ready to set balance (Internal error)", false);
            return;
        }

        const rawValue = inputRef.current!.value;
        const parsedValue = parseInt(rawValue, 10);
        if (isNaN(parsedValue) || parsedValue < 0) {
            snackbarStore.addFailure("Please enter a valid number", false);
            return;
        }
        const valueInCredits = parsedValue * 1000000;
        await runCommand(setCredits({
            lastKnownBalance: balance,
            newBalance: valueInCredits,
            wallet: walletBalance.wallet
        }));

        setIsEditing(false);
        if (requestReload) requestReload();
    }, [setIsEditing, inputRef.current, loading, walletBalance, balance, runCommand]);

    const onSubmitQuota = useCallback(async (e) => {
        e.preventDefault();
        if (loading) return;
        const rawValue = quotaRef.current!.value;
        const parsedValue = parseInt(rawValue, 10);
        if (isNaN(parsedValue) || parsedValue < 0) {
            snackbarStore.addFailure("Please enter a valid number", false);
            return;
        }

        const valueInBytes = parsedValue * 1000000000;
        await runCommand(updateQuota({path: `/projects/${subproject.id}`, quotaInBytes: valueInBytes}));

        setIsEditingQuota(false);
        fetchQuota({...quotaParams, reloadId: Math.random()});
        if (requestReload) requestReload();
    }, [setIsEditingQuota, quotaParams, fetchQuota, quotaRef, runCommand, loading]);

    useEffect(() => {
        if (inputRef.current && isEditing) {
            inputRef.current!.value = ((balance ?? 0) / 1000000).toString();
        }
    }, [inputRef.current, isEditing]);

    useEffect(() => {
        if (quotaRef.current && isEditingQuota) {
            if (quotaInTotal === -1) {
                quotaRef.current!.value = "0";
            } else {
                quotaRef.current!.value = ((quotaInTotal ?? 0) / 1000000000).toString();
            }
        }
    }, [quotaRef.current, isEditingQuota]);

    async function renameSubproject(): Promise<void> {
        const title = subprojectRenamingRef.current?.value;
        if (!title) {
            snackbarStore.addFailure("Project title can't be empty.", false);
            return;
        }

        if (title === subproject.title) {
            snackbarStore.addFailure("Project is already named that.", false);
            return;
        }

        try {
            await runCommand(renameProject({
                id: subproject.id,
                newTitle: title
            }));
            snackbarStore.addSuccess("Subproject renamed", false);
            setEditingName(false);
            reloadSubprojects?.();
        } catch (e) {
            snackbarStore.addFailure(errorMessageOrDefault(e, "Failed to rename project"), false);
        }
    }

    return <>
        <ListRow
            left={
                isEditingName && allowManagement ?
                    <>
                        <Input ref={subprojectRenamingRef} fontSize="large" defaultValue={subproject.title} />
                        <ButtonGroup ml="8px" width="130px">
                            <Button width="45px" color="green" onClick={renameSubproject} attached><Icon name="check" /></Button>
                            <Button width="45px" color="red" onClick={() => setEditingName(false)}><Icon name="close" /></Button>
                        </ButtonGroup>
                    </>
                    : <Text>{subproject.title}</Text>

            }
            right={!allowManagement || isEditingName ? null : (
                <>
                    <Flex alignItems={"center"} justifyContent={"flex-end"}>
                        {!isEditingQuota ? (
                            balance === undefined ? (
                                <>
                                    <Button height="35px" width={"135px"} onClick={() => {
                                        snackbarStore.addInformation("You must select a resource above", false);
                                        if (shakeWallets) shakeWallets();
                                    }}>
                                        Edit allocation
                                    </Button>
                                </>
                            ) : (
                                    <>
                                        {!isEditing ? (
                                            <>
                                                <AllocationEditor>
                                                    {creditFormatter(balance, 0)}&nbsp;
                                                <Tooltip trigger={<>({percentageUsed.toFixed(2)}% used)</>}>
                                                        {creditFormatter(used, 0)} of {creditFormatter(allocated, 0)} used
                                                </Tooltip>
                                                </AllocationEditor>
                                                <Button pr={8} pl={8} onClick={() => setIsEditing(true)}>
                                                    <Icon name="edit" size={14} />
                                                </Button>
                                            </>
                                        ) : (
                                                <AllocationForm onSubmit={onSubmit}>
                                                    <AllocationEditor>
                                                        <Label>Allocation:</Label>
                                                        <Input ref={inputRef} noBorder autoFocus width={120} />
                                                        <span>DKK</span>
                                                        {loading ?
                                                            <HexSpin size={16} />
                                                            :
                                                            <Icon
                                                                size={16}
                                                                ml="10px"
                                                                cursor="pointer"
                                                                name="close"
                                                                color="red"
                                                                onClick={() => setIsEditing(false)}
                                                            />
                                                        }
                                                    </AllocationEditor>

                                                    <Button type="submit" color="green"
                                                        disabled={loading}>
                                                        Allocate
                                            </Button>
                                                </AllocationForm>
                                            )
                                        }
                                    </>
                                )
                        ) : null}

                        {!isEditing ? (
                            quotaInTotal === undefined ? null : (
                                <Flex alignItems={"center"} justifyContent={"flex-end"}>
                                    {!isEditingQuota ? (
                                        <>
                                            <AllocationEditor width={"100px"}>
                                                {quotaInTotal === -1 ? "No quota" : sizeToString(quotaInTotal)}
                                            </AllocationEditor>
                                            <Button pl={8} pr={8} onClick={() => setIsEditingQuota(true)}>
                                                <Icon name="edit" size={14} />
                                            </Button>
                                        </>
                                    ) : (
                                            <AllocationForm onSubmit={onSubmitQuota}>
                                                <AllocationEditor>
                                                    <Label>Quota:</Label>
                                                    <Input ref={quotaRef} noBorder autoFocus />
                                                    <span>GB</span>
                                                    {loading ?
                                                        <HexSpin size={16} />
                                                        :
                                                        <Icon
                                                            size={16}
                                                            ml="10px"
                                                            cursor="pointer"
                                                            name="close"
                                                            color="red"
                                                            onClick={() => setIsEditingQuota(false)}
                                                        />
                                                    }
                                                </AllocationEditor>

                                                <Button type="submit" color="green"
                                                    disabled={loading}>
                                                    Allocate
                                            </Button>
                                            </AllocationForm>
                                        )}
                                </Flex>
                            )
                        ) : null}


                    </Flex>
                </>
            )
            }
        />
    </>;
};

export default Subprojects;
