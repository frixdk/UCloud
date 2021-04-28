import * as UCloud from "UCloud";
import {PropType, shortUUID} from "UtilityFunctions";
import {compute} from "UCloud";
type Job = compute.Job;

export type JobState = NonNullable<PropType<UCloud.compute.JobUpdate, "state">>;
export type JobSortBy = NonNullable<PropType<UCloud.compute.JobsBrowseRequest, "sortBy">>;

export function isJobStateTerminal(state: JobState): boolean {
    return state === "SUCCESS" || state === "FAILURE" || state === "EXPIRED";
}

export const stateToOrder = (state: JobState): 0 | 1 | 2 | 3 | 4 | 5 => {
    switch (state) {
        case "IN_QUEUE":
            return 0;
        case "RUNNING":
            return 1;
        /*
        case JobState.READY:
        return 2;
        */
        case "SUCCESS":
            return 3;
        case "FAILURE":
            return 3;
        case "EXPIRED":
            return 3;
        default:
            return 0;
    }
};

export const stateToTitle = (state: JobState): string => {
    switch (state) {
        case "FAILURE":
            return "Failure";
        case "IN_QUEUE":
            return "In queue";
        case "RUNNING":
            return "Running";
        case "SUCCESS":
            return "Success";
        case "CANCELING":
            return "Canceling";
        case "EXPIRED":
            return "Expired";
        /*
        case JobState.READY:
        return "Ready";
        */
        default:
            return "Unknown";
    }
};

export function jobTitle(job: Job): string {
    return job.specification.name ?? shortUUID(job.id)
}

export function jobAppTitle(job: Job): string {
    return job.specification.resolvedApplication?.metadata?.title ?? job.specification.application.name;
}

export function jobAppVersion(job: Job): string {
    return job.specification.application.version;
}
