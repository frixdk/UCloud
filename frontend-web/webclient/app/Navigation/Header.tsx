import {Client} from "Authentication/HttpClientInstance";
import {UserAvatar} from "AvataaarLib/UserAvatar";
import BackgroundTask from "BackgroundTasks/BackgroundTask";
import {HeaderSearchType, KeyCode} from "DefaultObjects";
import {HeaderStateToProps} from "Navigation";
import {setPrioritizedSearch} from "Navigation/Redux/HeaderActions";
import Notification from "Notifications";
import {usePromiseKeeper} from "PromiseKeeper";
import * as React from "react";
import {connect} from "react-redux";
import {useHistory, useLocation} from "react-router";
import {Dispatch} from "redux";
import * as SearchActions from "Search/Redux/SearchActions";
import * as ui from "ui-components";
import {DevelopmentBadgeBase} from "ui-components/Badge";
import ClickableDropdown from "ui-components/ClickableDropdown";
import {Dropdown} from "ui-components/Dropdown";
import Link from "ui-components/Link";
import {TextSpan} from "ui-components/Text";
import {ThemeToggler} from "ui-components/ThemeToggle";
import {findAvatar} from "UserSettings/Redux/AvataaarActions";
import {searchPage} from "Utilities/SearchUtilities";
import {getQueryParamOrElse} from "Utilities/URIUtilities";
import {
    displayErrorMessageOrDefault,
    inDevEnvironment,
    isLightThemeStored,
    prettierString,
    useFrameHidden,
    stopPropagationAndPreventDefault
} from "UtilityFunctions";
import CONF from "../../site.config.json";
import {ContextSwitcher} from "Project/ContextSwitcher";
import {NewsPost} from "Dashboard/Dashboard";
import {AutomaticGiftClaim} from "Gifts/AutomaticGiftClaim";
import {VersionManager} from "VersionManager/VersionManager";
import * as Applications from "Applications"
import {styled} from "@linaria/react";
import {theme} from "ui-components";
import {themeColor} from "ui-components/theme";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

interface HeaderProps extends HeaderStateToProps, HeaderOperations {
    toggleTheme(): void;
}

const DevelopmentBadge = (): JSX.Element | null => [CONF.DEV_SITE, CONF.STAGING_SITE].includes(window.location.host) ||
inDevEnvironment() ? <DevelopmentBadgeBase>{window.location.host}</DevelopmentBadgeBase> : null;

export function NonAuthenticatedHeader(): JSX.Element {
    return (
        <HeaderContainer>
            <Logo/>
            <ui.Box ml="auto"/>
            <ui.Link to="/login">
                <ui.Button color={themeColor("green")} textColor={themeColor("headerIconColor")} mr="12px">Log in
                </ui.Button>
            </ui.Link>
        </HeaderContainer>
    );
}

function Header(props: HeaderProps): JSX.Element | null {
    const [upcomingDowntime, setUpcomingDowntime] = React.useState(-1);
    const [intervalId, setIntervalId] = React.useState<any>(-1);
    const history = useHistory();
    const promises = usePromiseKeeper();

    React.useEffect(() => {
        if (Client.isLoggedIn) {
            props.fetchAvatar();
            fetchDowntimes();
        }
        setIntervalId(setInterval(fetchDowntimes, 600_000));
        return () => {
            if (intervalId !== -1) clearInterval(intervalId);
        };
    }, [Client.isLoggedIn]);

    if (useFrameHidden()) return null;
    if (!Client.isLoggedIn) return null;

    function toSearch(): void {
        history.push("/search/files");
    }

    const {refresh, spin} = props;

    return (
        <HeaderContainer>
            <Logo/>
            <ContextSwitcher/>
            <ui.Box ml="auto"/>
            <ui.Hide xs sm md lg>
                <Search/>
            </ui.Hide>
            <ui.Hide xxl xl>
                <ui.Icon
                    name="search"
                    size="32"
                    mr="3px"
                    cursor="pointer"
                    onClick={toSearch}
                />
            </ui.Hide>
            <ui.Box mr="auto"/>
            {upcomingDowntime !== -1 ? (
                <Link to={`/news/detailed/${upcomingDowntime}`}>
                    <ui.Tooltip tooltip={"Upcoming downtime"}>
                        <ui.Icon color={themeColor("yellow")} name="warning"/>
                    </ui.Tooltip>
                </Link>
            ) : null}
            <ui.Hide xs sm md lg>
                <DevelopmentBadge/>
            </ui.Hide>
            <VersionManager/>
            <BackgroundTask/>
            <ui.Flex width="48px" justifyContent="center">
                <Refresh spin={spin} onClick={refresh} headerLoading={props.statusLoading}/>
            </ui.Flex>
            <ui.Support/>
            <Notification/>
            <AutomaticGiftClaim/>
            <ClickableDropdown
                width="200px"
                left="-180%"
                trigger={<ui.Flex>{Client.isLoggedIn ? <UserAvatar avatar={props.avatar} /> : null}</ui.Flex>}
            >
                {!CONF.STATUS_PAGE ? null : (
                    <>
                        <ui.Box>
                            <ui.ExternalLink color={themeColor("black")} href={CONF.STATUS_PAGE}>
                                <ui.Flex color={themeColor("black")}>
                                    <ui.Icon name="favIcon" mr="0.5em" my="0.2em" size="1.3em"/>
                                    <TextSpan>Site status</TextSpan>
                                </ui.Flex>
                            </ui.ExternalLink>
                        </ui.Box>
                        <ui.Divider/>
                    </>
                )}
                <ui.Box>
                    <Link color={themeColor("black")} to="/users/settings">
                        <ui.Flex color={themeColor("black")}>
                            <ui.Icon name="properties" color2={themeColor("gray")} mr="0.5em" my="0.2em" size="1.3em"/>
                            <TextSpan>Settings</TextSpan>
                        </ui.Flex>
                    </Link>
                </ui.Box>
                <ui.Flex>
                    <Link to={"/users/avatar"}>
                        <ui.Flex color={themeColor("black")}>
                            <ui.Icon name="user" color={themeColor("black")} color2="gray" mr="0.5em" my="0.2em"
                                     size="1.3em"/>
                            <TextSpan>Edit Avatar</TextSpan>
                        </ui.Flex>
                    </Link>
                </ui.Flex>
                <ui.Flex onClick={() => Client.logout()}>
                    <ui.Icon name="logout" color2={themeColor("gray")} mr="0.5em" my="0.2em" size="1.3em"/>
                    Logout
                </ui.Flex>
                <ui.Divider/>
                <span>
                    <ui.Flex cursor="auto">
                        <ThemeToggler
                            isLightTheme={isLightThemeStored()}
                            onClick={onToggleTheme}
                        />
                    </ui.Flex>
                </span>
            </ClickableDropdown>
        </HeaderContainer>
    );

    function onToggleTheme(e: React.SyntheticEvent<HTMLDivElement, Event>): void {
        stopPropagationAndPreventDefault(e);
        props.toggleTheme();
    }

    async function fetchDowntimes(): Promise<void> {
        try {
            if (!Client.isLoggedIn) return;
            const result = await promises.makeCancelable(Client.get<Page<NewsPost>>("/news/listDowntimes")).promise;
            if (result.response.items.length > 0) setUpcomingDowntime(result.response.items[0].id);
        } catch (err) {
            displayErrorMessageOrDefault(err, "Could not fetch upcoming downtimes.");
        }
    }
}

export const Refresh = ({
                            onClick,
                            spin,
                            headerLoading
                        }: { onClick?: () => void; spin: boolean; headerLoading?: boolean }): JSX.Element => !!onClick || headerLoading ? (
    <RefreshIcon
        data-tag="refreshButton"
        name="refresh"
        spin={spin || headerLoading}
        onClick={onClick}
    />
) : <ui.Box width="24px"/>;

const RefreshIcon = styled(ui.Icon)`
  cursor: pointer;
`;

const HeaderContainer = styled.div`
  display: flex;
  height: 48px;
  align-items: center;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 100;
  box-shadow: ${ui.theme.shadows[0]};
  color: var(--headerText);
  background-color: var(--headerBg);
`;

const LogoText = styled(ui.Text)`
  vertical-align: top;
  font-weight: 700;
`;

const Logo = (): JSX.Element => (
    <Link
        to="/"
        width={"190px"}
    >
        <ui.Flex alignItems="center" ml="15px">
            <ui.Icon name="logoEsc" size="38px"/>
            <ui.Text color="var(--headerText)" fontSize={theme.fontSizes[4] + "px"}
                     ml="8px">{CONF.PRODUCT_NAME}</ui.Text>
            {!CONF.VERSION_TEXT ? null : (
                <LogoText
                    ml="4px"
                    mt={-7}
                    color={themeColor("red")}
                    fontSize={17}
                >
                    {CONF.VERSION_TEXT}
                </LogoText>
            )}
        </ui.Flex>
    </Link>
);

const SearchInput = styled.div`
  display: flex;
  min-width: 250px;
  width: 425px;
  max-width: 425px;
  height: 36px;
  align-items: center;
  color: white;
  background-color: rgba(236, 239, 244, 0.25);
  border-radius: 5px;

  & > input::-webkit-input-placeholder, input::-moz-placeholder, input::-ms-input-placeholder, input:-moz-placeholder {
    color: white;
  }

  & > input:focus::-webkit-input-placeholder, input:focus::-moz-placeholder, input:focus::-ms-input-placeholder, input:focus::-moz-placeholder {
    color: black;
  }

  & > input:focus ~ div > span > div > svg, input:focus + div > label > svg {
    color: black;
  }

  & > input ~ div > span > div > svg, input + div > label > svg {
    color: white;
  }

  & > input:focus {
    color: black;
    background-color: white;
    transition: all ${ui.theme.duration.fast} ease 0s;
  }

  & > input {
    color: white;
    transition: all ${ui.theme.duration.fast} ease 0s;
  }

  & > ${Dropdown} > div > input {
    width: 350px;
    height: 36px;
  }
`;


interface SearchStateProps {
    prioritizedSearch: HeaderSearchType;
    search: string;
}

interface SearchOperations {
    setSearchType: (st: HeaderSearchType) => void;
    setSearch: (search: string) => void;
}

type SearchProps = SearchOperations & SearchStateProps;


// eslint-disable-next-line no-underscore-dangle
const _Search = (props: SearchProps): JSX.Element => {
    const history = useHistory();
    const location = useLocation();
    React.useEffect(() => {
        props.setSearch(getQueryParamOrElse({history, location}, "query", ""));
    }, []);
    const {prioritizedSearch, setSearchType} = props;
    const allowedSearchTypes: HeaderSearchType[] = ["files", "applications"];
    return (
        <ui.Relative>
            <SearchInput>
                <ui.Input
                    pl="30px"
                    pr="28px"
                    pt="6px"
                    pb="6px"
                    id="search_input"
                    type="text"
                    value={props.search}
                    noBorder
                    onKeyDown={e => {
                        if (e.keyCode === KeyCode.ENTER && props.search) fetchAll();
                    }}
                    onChange={e => props.setSearch(e.target.value)}
                />
                <ui.Absolute left="6px" top="7px">
                    <ui.Label htmlFor="search_input">
                        <ui.Icon name="search" size="20"/>
                    </ui.Label>
                </ui.Absolute>
                <ClickableDropdown
                    keepOpenOnOutsideClick
                    overflow="visible"
                    left={-425}
                    top={15}
                    width="425px"
                    colorOnHover={false}
                    keepOpenOnClick
                    squareTop
                    trigger={(
                        <ui.Absolute top={-12.5} right={12} bottom={0} left={-22}>
                            <ui.Icon cursor="pointer" name="chevronDown" size="12px"/>
                        </ui.Absolute>
                    )}
                >
                    <ui.SelectableTextWrapper>
                        <ui.Box ml="auto"/>
                        {allowedSearchTypes.map(it => (
                            <ui.SelectableText
                                key={it}
                                onClick={() => setSearchType(it)}
                                mr="1em"
                                selected={it === prioritizedSearch}
                            >
                                {prettierString(it)}
                            </ui.SelectableText>
                        ))}
                        <ui.Box mr="auto"/>
                    </ui.SelectableTextWrapper>
                    {prioritizedSearch !== "applications" ? null : <Applications.SearchWidget/>}
                </ClickableDropdown>
            </SearchInput>
        </ui.Relative>
    );

    function fetchAll(itemsPerPage?: number): void {
        history.push(searchPage(prioritizedSearch, props.search));
    }
};

const mapSearchStateToProps = ({
                                   header,
                                   simpleSearch
                               }: ReduxObject): SearchStateProps => ({
    prioritizedSearch: header.prioritizedSearch,
    search: simpleSearch.search,
});

const mapSearchDispatchToProps = (dispatch: Dispatch): SearchOperations => ({
    setSearchType: (st: HeaderSearchType) => dispatch(setPrioritizedSearch(st)),
    setSearch: search => dispatch(SearchActions.setSearch(search))
});

const Search = connect(mapSearchStateToProps, mapSearchDispatchToProps)(_Search);

interface HeaderOperations {
    fetchAvatar: () => void;
}

const mapDispatchToProps = (dispatch: Dispatch): HeaderOperations => ({
    fetchAvatar: async () => {
        const action = await findAvatar();
        if (action !== null) dispatch(action);
    },
});

const mapStateToProps = ({header, avatar, ...rest}: ReduxObject): HeaderStateToProps => ({
    ...header,
    avatar,
    spin: isAnyLoading(rest as ReduxObject),
    statusLoading: rest.status.loading
});

const isAnyLoading = (rO: ReduxObject): boolean =>
    rO.loading === true || rO.notifications.loading || rO.activity.loading;

export default connect<HeaderStateToProps, HeaderOperations>(mapStateToProps, mapDispatchToProps)(Header);
