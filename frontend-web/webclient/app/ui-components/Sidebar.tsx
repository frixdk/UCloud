import {Client} from "Authentication/HttpClientInstance";
import * as React from "react";
import {connect, useDispatch} from "react-redux";
import {copyToClipboard, inDevEnvironment, useFrameHidden} from "UtilityFunctions";
import CONF from "../../site.config.json";
import Box from "./Box";
import ExternalLink from "./ExternalLink";
import Flex from "./Flex";
import Icon, {IconName} from "./Icon";
import Link from "./Link";
import RatingBadge from "./RatingBadge";
import RBox from "./RBox";
import Text, {EllipsedText} from "./Text";
import theme, {themeColor, ThemeColor} from "./theme";
import Tooltip from "./Tooltip";
import {useEffect} from "react";
import {setActivePage} from "Navigation/Redux/StatusActions";
import {styled} from "@linaria/react";
import {css} from "@linaria/core";

const SidebarElementContainer = styled.div`
  margin-left: 22px;
  display: flex;
  justify-content: left;
  flex-flow: row;
  align-items: center;

  & > div {
    white-space: nowrap;
  }
`;

// This is applied to SidebarContainer on small screens
// TODO
const HideText = css``;
/*
${({theme}) => theme.mediaQueryLT.xl} {

    will-change: transform;
    transition: transform ${({theme}) => theme.timingFunctions.easeOut} ${({theme}) => theme.duration.fastest} ${({theme}) => theme.transitionDelays.xsmall};
    transform: translate(-122px,0); //122 = 190-68 (original - final width)

    & ${Icon},${RatingBadge} {
        will-change: transform;
        transition: transform ${({theme}) => theme.timingFunctions.easeOut} ${({theme}) => theme.duration.fastest} ${({theme}) => theme.transitionDelays.xsmall};
        transform: translate(122px,0); //inverse transformation; same transition function!
    }

    & ${SidebarElementContainer} > ${Text} {
        // transition: opacity ${({theme}) => theme.timingFunctions.easeOutQuit} ${({theme}) => theme.duration.fastest} ${({theme}) => theme.transitionDelays.xsmall};
        transition: opacity ${({theme}) => theme.timingFunctions.stepStart} ${({theme}) => theme.duration.fastest} ${({theme}) => theme.transitionDelays.xsmall};
        opacity: 0;
        will-change: opacity;
    }


    &:hover {
            transition: transform ${({theme}) => theme.timingFunctions.easeIn} ${({theme}) => theme.duration.fastest} ${({theme}) => theme.transitionDelays.xsmall};
            transform: translate(0,0);

            & ${Icon},${RatingBadge} {
                transition: transform ${({theme}) => theme.timingFunctions.easeIn} ${({theme}) => theme.duration.fastest} ${({theme}) => theme.transitionDelays.xsmall};
                transform: translate(0,0); //inverter transformation
            }

            ${SidebarElementContainer} > ${Text} {
                // transition: opacity ${({theme}) => theme.timingFunctions.easeInQuint} ${({theme}) => theme.duration.fastest} ${({theme}) => theme.transitionDelays.xsmall};
                transition: opacity ${({theme}) => theme.timingFunctions.stepEnd} ${({theme}) => theme.duration.fastest} ${({theme}) => theme.transitionDelays.xsmall};
                opacity: 1;
        }
    }
}
`;
 */

const SidebarContainer = styled.div`
  flex-direction: column;
  width: 190px;
  display: flex;
  position: fixed;
  z-index: 80;
  top: 0;
  left: 0;
  padding-top: 48px;
  height: 100%;
  background-color: var(--lightGray);
  // {HideText} 
`;

export const SidebarTextLabel: React.FunctionComponent<{
    icon: IconName;
    iconSize?: string;
    textSize?: number;
    space?: string;
}> = ({icon, iconSize = "24px", textSize = 3, children, space = "22px"}) => (
    <SidebarElementContainer>
        <Icon name={icon} color={themeColor("iconColor")} color2={themeColor("iconColor2")} size={iconSize}
              mr={space}/>
        <Text fontSize={theme.fontSizes[textSize] + "px"}> {children} </Text>
    </SidebarElementContainer>
);

const SidebarLink = styled(Link)`
  &[data-active="true"]:not(:hover) > * > svg {
    filter: saturate(500%);
  }
  
  &[data-active="true"]:not(:hover) > * > div {
    color: var(--blue);
  }
  
  &:not([data-active="true"]):hover > * > div {
    color: var(--blue);
  }
  
  &:not([data-active="true"]):hover > * > svg {
    filter: saturate(500%);
  }

  text-decoration: none;
  color: rgb(30, 37, 46);
`;

interface SidebarElement {
    icon: IconName;
    label: string;
    to: string;
    external?: boolean;
    activePage: SidebarPages;
}

const SidebarElement = ({icon, label, to, activePage}: SidebarElement): JSX.Element => (
    <SidebarLink to={to} data-active={enumToLabel(activePage) === label ? true : undefined}>
        <SidebarTextLabel icon={icon}>{label}</SidebarTextLabel>
    </SidebarLink>
);

function enumToLabel(value: SidebarPages): string {
    switch (value) {
        case SidebarPages.Files:
            return "Files";
        case SidebarPages.Shares:
            return "Shares";
        case SidebarPages.Projects:
            return "Projects";
        case SidebarPages.AppStore:
            return "Apps";
        case SidebarPages.Runs:
            return "Runs";
        case SidebarPages.Publish:
            return "Publish";
        case SidebarPages.Activity:
            return "Activity";
        case SidebarPages.Admin:
            return "Admin";
        default:
            return "";
    }
}

const SidebarSpacer = (): JSX.Element => (<Box mt="12px"/>);

const SidebarPushToBottom = styled.div`
  flex-grow: 1;
`;

interface MenuElement {
    icon: IconName;
    label: string;
    to: string | (() => string);
    show?: () => boolean
}

interface SidebarMenuElements {
    items: MenuElement[];
    predicate: () => boolean;
}

export const sideBarMenuElements: {
    guest: SidebarMenuElements;
    general: SidebarMenuElements;
    auditing: SidebarMenuElements;
    admin: SidebarMenuElements;
} = {
    guest: {
        items: [
            {icon: "files", label: "Files", to: "/login"},
            {icon: "projects", label: "Projects", to: "/login"},
            {icon: "apps", label: "Apps", to: "/login"}
        ], predicate: (): boolean => !Client.isLoggedIn
    },
    general: {
        items: [
            {icon: "files", label: "Files", to: "/files/"},
            {icon: "projects", label: "Projects", to: "/projects", show: (): boolean => Client.hasActiveProject},
            {icon: "shareMenu", label: "Shares", to: "/shares/", show: (): boolean => !Client.hasActiveProject},
            {icon: "appStore", label: "Apps", to: "/applications/overview"},
            {icon: "results", label: "Runs", to: "/applications/results/"}
        ], predicate: (): boolean => Client.isLoggedIn
    },
    auditing: {items: [{icon: "activity", label: "Activity", to: "/activity/"}], predicate: () => Client.isLoggedIn},
    admin: {items: [{icon: "admin", label: "Admin", to: "/admin"}], predicate: () => Client.userIsAdmin}
};

interface SidebarStateProps {
    page: SidebarPages;
    loggedIn: boolean;
    activeProject?: string;
}

interface SidebarProps extends SidebarStateProps {
    sideBarEntries?: any;
}

const Sidebar = ({sideBarEntries = sideBarMenuElements, page, loggedIn}: SidebarProps): JSX.Element | null => {
    if (!loggedIn) return null;

    if (useFrameHidden()) return null;

    const sidebar = Object.keys(sideBarEntries)
        .map(key => sideBarEntries[key])
        .filter(it => it.predicate());
    return (
        <SidebarContainer>
            {sidebar.map((category, categoryIdx) => (
                <React.Fragment key={categoryIdx}>
                    {category.items.filter((it: MenuElement) => it?.show?.() ?? true).map(({
                                                                                               icon,
                                                                                               label,
                                                                                               to
                                                                                           }: MenuElement) => (
                        <React.Fragment key={label}>
                            <SidebarSpacer/>
                            <SidebarElement
                                icon={icon}
                                activePage={page}
                                label={label}
                                to={typeof to === "function" ? to() : to}
                            />
                        </React.Fragment>
                    ))}
                </React.Fragment>
            ))}
            <SidebarPushToBottom/>
            {/* Screen size indicator */}
            {inDevEnvironment() ? <Flex mb={"5px"} width={190} ml={19} justifyContent="left"><RBox/> </Flex> : null}
            {!Client.isLoggedIn ? null : (
                <SidebarTextLabel
                    icon="id"
                    iconSize="1em"
                    textSize={1}
                    space={".5em"}
                >
                    <Tooltip tooltip={`Click top copy username to clipboard`}>
                        <EllipsedText
                            cursor="pointer"
                            onClick={copyUserName}
                            width="140px"
                        >
                            {Client.username}
                        </EllipsedText>
                    </Tooltip>
                </SidebarTextLabel>
            )}
            {!CONF.SITE_DOCUMENTATION_URL ? null : (
                <ExternalLink href={CONF.SITE_DOCUMENTATION_URL}>
                    <SidebarTextLabel icon="docs" iconSize="1em" textSize={1} space={".5em"}>
                        {`${CONF.PRODUCT_NAME} Docs`}
                    </SidebarTextLabel>
                </ExternalLink>
            )}
            {!CONF.DATA_PROTECTION_LINK ? null : (
                <ExternalLink href={CONF.DATA_PROTECTION_LINK}>
                    <SidebarTextLabel icon="verified" iconSize="1em" textSize={1} space={".5em"}>
                        {CONF.DATA_PROTECTION_TEXT}
                    </SidebarTextLabel>
                </ExternalLink>
            )}
            <Box mb="10px"/>
        </SidebarContainer>
    );
};

function copyUserName(): void {
    copyToClipboard({
        value: Client.username,
        message: "Username copied to clipboard"
    });
}

const mapStateToProps = ({status, project}: ReduxObject): SidebarStateProps => ({
    page: status.page,

    /* Used to ensure re-rendering of Sidebar after user logs in. */
    loggedIn: Client.isLoggedIn,

    /* Used to ensure re-rendering of Sidebar after project change. */
    activeProject: project.project
});

export enum SidebarPages {
    Files,
    Shares,
    Projects,
    AppStore,
    Runs,
    Publish,
    Activity,
    Admin,
    None
}

export function useSidebarPage(page: SidebarPages): void {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setActivePage(page));
        return () => {
            dispatch(setActivePage(SidebarPages.None));
        };
    });
}

export default connect<SidebarStateProps>(mapStateToProps)(Sidebar);
