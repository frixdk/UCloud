import * as React from "react";
import { DefaultLoading } from "LoadingIcon/LoadingIcon";
import { iconFromFilePath, toLowerCaseAndCapitalize } from "UtilityFunctions";
import { Link } from "react-router-dom";
import { Cloud } from "Authentication/SDUCloudObject"
import { favoriteFile, getParentPath, getFilenameFromPath } from "Utilities/FileUtilities";
import { updatePageTitle } from "Navigation/Redux/StatusActions";
import { setAllLoading, fetchFavorites, fetchRecentAnalyses, fetchRecentFiles, receiveFavorites, setErrorMessage } from "./Redux/DashboardActions";
import { connect } from "react-redux";
import { Card, List, Icon, Message } from "semantic-ui-react";
import * as moment from "moment";
import { FileIcon } from "UtilityComponents";
import {
    DASHBOARD_FAVORITE_ERROR,
    DASHBOARD_RECENT_ANALYSES_ERROR,
    DASHBOARD_RECENT_FILES_ERROR
} from "./Redux/DashboardReducer";
import { DashboardProps, DashboardOperations, DashboardStateProps } from ".";
import { Notification } from "Notifications";
import { Analysis } from "Applications";
import { File, FileType } from "Files";

class Dashboard extends React.Component<DashboardProps> {
    constructor(props) {
        super(props);
        const { favoriteFiles, recentFiles, recentAnalyses } = props;
        props.updatePageTitle();
        if (!favoriteFiles.length && !recentFiles.length && !recentAnalyses.length) {
            props.setAllLoading(true);
        }
        props.fetchFavorites();
        props.fetchRecentFiles();
        props.fetchRecentAnalyses();
    }

    render() {
        const { favoriteFiles, recentFiles, recentAnalyses, notifications, favoriteLoading, recentLoading,
            analysesLoading, favoriteError, recentFilesError, recentAnalysesError, errorDismissFavorites,
            errorDismissRecentAnalyses, errorDismissRecentFiles } = this.props;
        favoriteFiles.forEach((f: File) => f.favorited = true);
        const favoriteOrUnfavorite = (file: File) => {
            favoriteFile(file, Cloud);
            this.props.receiveFavorites(favoriteFiles.filter((f: File) => f.favorited));
        };

        return (
            <React.StrictMode>
                <ErrorMessage error={favoriteError} onDismiss={errorDismissFavorites} />
                <ErrorMessage error={recentFilesError} onDismiss={errorDismissRecentFiles} />
                <ErrorMessage error={recentAnalysesError} onDismiss={errorDismissRecentAnalyses} />
                <Card.Group className="mobile-padding">
                    <DashboardFavoriteFiles
                        files={favoriteFiles}
                        isLoading={favoriteLoading}
                        favorite={(file: File) => favoriteOrUnfavorite(file)}
                    />
                    <DashboardRecentFiles files={recentFiles} isLoading={recentLoading} />
                    <DashboardAnalyses analyses={recentAnalyses} isLoading={analysesLoading} />
                    <DashboardNotifications notifications={notifications} />
                </Card.Group>
            </React.StrictMode>
        );
    }
}

const DashboardFavoriteFiles = ({ files, isLoading, favorite }: { files: File[], isLoading: boolean, favorite: Function }) => {
    const noFavorites = files.length || isLoading ? null : (<h3><small>No favorites found</small></h3>);
    const filesList = files.map((file: File, i: number) =>
        (<List.Item key={i} className="itemPadding">
            <List.Content floated="right">
                <Icon name="star" color="blue" onClick={() => favorite(file)} />
            </List.Content>
            <ListFileContent path={file.path} type={file.type} link={false} pixelsWide={200} />
        </List.Item>)
    );

    return (
        <Card fluid={window.innerWidth <= 645}>
            <Card.Content>
                <Card.Header content="Favorite files" />
                <DefaultLoading loading={isLoading} />
                {noFavorites}
                <List divided size={"large"}>
                    {filesList}
                </List>
            </Card.Content >
        </Card >)
};

const ListFileContent = ({ path, type, link, pixelsWide }: { path: string, type: FileType, link: boolean, pixelsWide: 117 | 200 }) =>
    <List.Content>
        <FileIcon name={iconFromFilePath(path, type, Cloud.homeFolder)} size={undefined} link={link} color="grey" />
        <Link to={`/files/${type === "FILE" ? getParentPath(path) : path}`}>
            <span className={`limited-width-string-${pixelsWide}px`}>{getFilenameFromPath(path)}</span>
        </Link>
    </List.Content>


const DashboardRecentFiles = ({ files, isLoading }: { files: File[], isLoading: boolean }) => {
    return (
        <Card fluid={window.innerWidth <= 645}>
            <Card.Content>
                <Card.Header content="Recently used files" />
                {isLoading || files.length ? null : (<h3><small>No recently used files</small></h3>)}
                <DefaultLoading loading={isLoading} />
                <List divided size={"large"}>
                    {files.map((file, i) => (
                        <List.Item key={i} className="itemPadding">
                            <List.Content floated="right">
                                <List.Description>{moment(new Date(file.modifiedAt)).fromNow()}</List.Description>
                            </List.Content>
                            <ListFileContent path={file.path} type={file.type} link={file.link} pixelsWide={117} />
                        </List.Item>
                    ))}
                </List>
            </Card.Content>
        </Card>);
};

const DashboardAnalyses = ({ analyses, isLoading }: { analyses: Analysis[], isLoading: boolean }) => (
    <Card fluid={window.innerWidth <= 645}>
        <Card.Content>
            <Card.Header content="Recent Analyses" />
            <DefaultLoading loading={isLoading} />
            {isLoading || analyses.length ? null : (<h3><small>No Analyses found</small></h3>)}
            <List divided size={"large"}>
                {analyses.map((analysis: Analysis, index: number) =>
                    <List.Item key={index} className="itemPadding">
                        <List.Content floated="right" content={toLowerCaseAndCapitalize(analysis.state)} />
                        <List.Icon name={statusToIconName(analysis.state)} color={statusToColor(analysis.state)} />
                        <List.Content>
                            <Link to={`/analyses/${analysis.jobId}`}>{analysis.appName}</Link>
                        </List.Content>
                    </List.Item>
                )}
            </List>
        </Card.Content>
    </Card>
);

const DashboardNotifications = ({ notifications }: { notifications: Notification[] }) => (
    <Card fluid={window.innerWidth <= 645}>
        <Card.Content>
            <Card.Header content="Recent notifications" />
            {notifications.length === 0 ? <h3><small>No notifications</small></h3> : null}
            <List divided>
                {notifications.slice(0, 10).map((n: Notification, i: number) =>
                    <List.Item key={i}>
                        <Notification notification={n} />
                    </List.Item>
                )}
            </List>
        </Card.Content>
    </Card>
);

const Notification = ({ notification }: { notification: Notification }) => {
    switch (notification.type) {
        case "SHARE_REQUEST":
            return (
                <>
                    <List.Content floated="right">
                        <List.Description content={moment(new Date(notification.ts as number)).fromNow()} />
                    </List.Content>
                    <List.Icon name="share alternate" color="blue" verticalAlign="middle" />
                    <List.Content header="Share Request" description={notification.message} />
                </>
            )
        default: {
            return null;
        }
    }
};

const statusToIconName = (status: string) => status === "SUCCESS" ? "check" : "x";
const statusToColor = (status: string) => status === "SUCCESS" ? "green" : "red";

const ErrorMessage = ({ error, onDismiss }: { error?: string, onDismiss: () => void }) => error != null ?
    (<Message content={error} onDismiss={onDismiss} negative />) : null;

const mapDispatchToProps = (dispatch): DashboardOperations => ({
    errorDismissFavorites: () => dispatch(setErrorMessage(DASHBOARD_FAVORITE_ERROR, undefined)),
    errorDismissRecentAnalyses: () => dispatch(setErrorMessage(DASHBOARD_RECENT_ANALYSES_ERROR, undefined)),
    errorDismissRecentFiles: () => dispatch(setErrorMessage(DASHBOARD_RECENT_FILES_ERROR, undefined)),
    updatePageTitle: () => dispatch(updatePageTitle("Dashboard")),
    setAllLoading: (loading) => dispatch(setAllLoading(loading)),
    fetchFavorites: () => dispatch(fetchFavorites()),
    fetchRecentFiles: () => dispatch(fetchRecentFiles()),
    fetchRecentAnalyses: () => dispatch(fetchRecentAnalyses()),
    receiveFavorites: (files) => dispatch(receiveFavorites(files))
});

const mapStateToProps = (state): DashboardStateProps => {
    const {
        favoriteFiles,
        favoriteError,
        recentFiles,
        recentFilesError,
        recentAnalyses,
        recentAnalysesError,
        favoriteLoading,
        recentLoading,
        analysesLoading,
    } = state.dashboard;
    return {
        favoriteError,
        favoriteFiles,
        recentFilesError,
        recentFiles,
        recentAnalysesError,
        recentAnalyses,
        favoriteLoading,
        recentLoading,
        analysesLoading,
        notifications: state.notifications.page.items,
        favoriteFilesLength: favoriteFiles.length // Hack to ensure re-rendering
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
