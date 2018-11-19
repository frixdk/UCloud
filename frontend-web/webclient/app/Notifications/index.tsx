import * as React from "react";
import { Cloud } from "Authentication/SDUCloudObject"
import { Feed as SFeed, SemanticICONS as SSemanticICONS, Icon as SIcon, Button as SButton, Divider as SDivider } from 'semantic-ui-react';
import { Redirect } from "react-router";
import * as moment from "moment";
import { connect } from "react-redux";
import { withRouter } from "react-router";
import { Page } from "Types";
import { fetchNotifications, notificationRead } from "./Redux/NotificationsActions";
import { History } from "history";
import { setUploaderVisible } from "Uploader/Redux/UploaderActions";
import { Dispatch } from "redux";
import { Relative, Flex, Icon, Badge, Absolute, Box, theme } from "ui-components";
import ClickableDropdown from "ui-components/ClickableDropdown";
import { TextSpan } from "ui-components/Text";
import styled from "styled-components";
import { IconName } from "ui-components/Icon";

interface NotificationProps {
    page: Page<Notification>
    redirectTo: string
    fetchNotifications: Function,
    notificationRead: Function,
    history: History
    activeUploads: number
}

class Notifications extends React.Component<NotificationProps & NotificationsDispatchToProps> {
    constructor(props) {
        super(props);
    }

    public componentDidMount() {
        this.reload();
        setInterval(() => this.reload(), 30_000);
    }

    private reload() {
        this.props.fetchNotifications();
    }

    private onNotificationAction(notification: Notification) {
        switch (notification.type) {
            case "APP_COMPLETE":
                // TODO This is buggy! Does't update if already present on analyses page
                // TODO Should refactor these URLs somewhere else
                this.props.history.push(`/analyses/${notification.meta.jobId}`);
                break;
            case "SHARE_REQUEST":
                // TODO This is a bit lazy
                this.props.history.push("/shares");
                break;
        }
    }

    public render() {
        const { activeUploads, page } = this.props;
        const entries: JSX.Element[] = page.items.map((notification, index) =>
            <NotificationEntry
                key={index}
                notification={notification}
                onMarkAsRead={(it) => this.props.notificationRead(it.id)}
                onAction={(it) => this.onNotificationAction(it)}
            />
        );

        if (this.props.redirectTo) {
            return <Redirect to={this.props.redirectTo} />
        }

        const unreadLength = page.items.filter((e) => !e.read).length;
        const uploads = activeUploads > 0 ? (
            <>
                <SDivider />
                <SButton
                    content={`${activeUploads} active upload${activeUploads > 1 ? "s" : ""} in progress.`}
                    color="green"
                    fluid
                    onClick={() => this.props.showUploader()}
                />
                <SDivider />
            </>
        ) : null;
        const badgeCount = unreadLength + activeUploads;
        return (
            <ClickableDropdown width={"380px"} left={"-270px"} trigger={
                <Flex>
                    <Relative top="0" left="0">
                        <Flex justifyContent="center" width="60px">
                            <Icon cursor="pointer" name="notification" />
                        </Flex>
                        {badgeCount > 0 ? <Absolute top="-12px" left="28px">
                            <Badge bg="red">{unreadLength + activeUploads}</Badge>
                        </Absolute> : null}
                    </Relative>
                </Flex>
            }>
                <SFeed style={{ backgroundColor: "unset" }}>
                    {entries.length ? entries : <NoNotifications />}
                </SFeed>
                {uploads}
            </ClickableDropdown>
        );
    }
}

const NoNotifications = () =>
    <SFeed.Event className="notification">
        <SFeed.Content>
            <SFeed.Label>No notifications</SFeed.Label>
        </SFeed.Content>
    </SFeed.Event>

export interface Notification {
    type: string
    id: any
    message: string
    ts: Number
    read: boolean
    meta: any
}

interface NotificationEntryProps {
    notification: Notification
    onMarkAsRead?: (notification: Notification) => void
    onAction?: (notification: Notification) => void
}

export class NotificationEntry extends React.Component<NotificationEntryProps, any> {
    constructor(props: NotificationEntryProps) {
        super(props);
    }

    public render() {
        const { notification } = this.props;
        return (
            <NotificationWrapper read={notification.read} flexDirection="row" onClick={() => this.handleAction()}>
                <Box width="0.20" m="0 0.3em 0 0.3em">
                    <Icon size={1} name={this.resolveEventIcon(notification.type)} />
                </Box>
                <Box width="0.80">
                    <Flex flexDirection="column">
                        <TextSpan color="grey" fontSize={1}>{moment(notification.ts.toString(), "x").fromNow()}</TextSpan>
                        <TextSpan>{notification.message}</TextSpan>
                    </Flex>
                </Box>
            </NotificationWrapper>
        );
    }

    private handleRead() {
        if (this.props.onMarkAsRead) this.props.onMarkAsRead(this.props.notification);
    }

    private handleAction() {
        this.handleRead();
        if (this.props.onAction) this.props.onAction(this.props.notification);
    }

    private resolveEventIcon(eventType: string): IconName {
        switch (eventType) {
            case "APP_COMPLETE": return "information";
            case "SHARE_REQUEST": return "shares";
            default: return "warning";
        }
    }
}

const read = ({ read }) => read ? { backgroundColor: theme.colors.white } : { backgroundColor: theme.colors.gray };

const NotificationWrapper = styled(Flex)`
    ${read};
    margin: 0.1em 0.1em 0.1em 0.1em;
    padding: 0.3em 0.3em 0.3em 0.3em;
    border-radius: 3px;
    cursor: pointer;
    &:hover {
        background-color: ${theme.colors.lightGray};
    }
`;

interface NotificationsDispatchToProps {
    fetchNotifications: () => void
    notificationRead: (id: number) => void
    showUploader: () => void
}
const mapDispatchToProps = (dispatch: Dispatch): NotificationsDispatchToProps => ({
    fetchNotifications: async () => dispatch(await fetchNotifications()),
    notificationRead: async id => dispatch(await notificationRead(id)),
    showUploader: () => dispatch(setUploaderVisible(true))
});
const mapStateToProps = (state) => ({
    ...state.notifications,
    activeUploads: state.uploader.uploads.filter(it => it.uploadXHR &&
        it.uploadXHR.readyState > XMLHttpRequest.UNSENT && it.uploadXHR.readyState < XMLHttpRequest.DONE).length
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Notifications));