import {DashboardStateProps} from "Dashboard";
import {initDashboard} from "DefaultObjects";
import {DashboardActions} from "./DashboardActions";

export const SET_ALL_LOADING = "SET_ALL_LOADING";
export const DASHBOARD_RECENT_JOBS_ERROR = "DASHBOARD_RECENT_JOBS_ERROR";

const dashboard = (state: DashboardStateProps = initDashboard(), action: DashboardActions): DashboardStateProps => {
    switch (action.type) {
        case SET_ALL_LOADING: {
            const {loading} = action.payload;
            return {...state};
        }
        default: {
            return state;
        }
    }
};

export default dashboard;
