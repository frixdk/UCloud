import activity from "Activity/Redux/ActivityReducer";
import * as TaskRedux from "BackgroundTasks/redux";
import dashboard from "Dashboard/Redux/DashboardReducer";
import {initObject} from "DefaultObjects";
import detailedFileSearch from "Files/Redux/DetailedFileSearchReducer";
import fileInfo from "Files/Redux/FileInfoReducer";
import header, {CONTEXT_SWITCH, USER_LOGIN, USER_LOGOUT} from "Navigation/Redux/HeaderReducer";
import sidebar from "Navigation/Redux/SidebarReducer";
import status from "Navigation/Redux/StatusReducer";
import notifications from "Notifications/Redux/NotificationsReducer";
import * as ProjectRedux from "Project/Redux";
import {Action, AnyAction, combineReducers, createStore, Store} from "redux";
import {composeWithDevTools} from "redux-devtools-extension";
import {createResponsiveStateReducer, responsiveStoreEnhancer} from "redux-responsive";
import simpleSearch from "Search/Redux/SearchReducer";
import {responsiveBP} from "ui-components/theme";
import uploader from "Uploader/Redux/UploaderReducer";
import avatar from "UserSettings/Redux/AvataaarReducer";
import hookStore from "Utilities/ReduxHooks";

export function configureStore(
    initialObject: ReduxObject,
    reducers,
    enhancers?
): Store<ReduxObject, AnyAction> {
    const combinedReducers = combineReducers<ReduxObject, AnyAction>(reducers);
    const rootReducer = (state: ReduxObject, action: Action): ReduxObject => {
        if ([USER_LOGIN, USER_LOGOUT, CONTEXT_SWITCH].some(it => it === action.type)) {
            state = initObject();
        }
        return combinedReducers(state, action);
    };
    return createStore<ReduxObject, AnyAction, {}, {}>(rootReducer, initialObject, composeWithDevTools(enhancers));
}

export const responsive = createResponsiveStateReducer(
    responsiveBP,
    {infinity: "xxl"}
);

export const store = configureStore(initObject(), {
    activity,
    dashboard,
    header,
    status,
    sidebar,
    uploader,
    notifications,
    simpleSearch,
    detailedFileSearch,
    fileInfo,
    hookStore,
    avatar,
    loading,
    tasks: TaskRedux.reducer,
    project: ProjectRedux.reducer,
    responsive: createResponsiveStateReducer(
        responsiveBP,
        {infinity: "xxl"}),
}, responsiveStoreEnhancer);

function loading(state = false, action: {type: string}): boolean {
    switch (action.type) {
        case "LOADING_START":
            return true;
        case "LOADING_END":
            return false;
        default:
            return state;
    }
}
