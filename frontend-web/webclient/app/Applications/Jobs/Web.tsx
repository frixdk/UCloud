import * as React from "react";
import * as UCloud from "UCloud";
import {snackbarStore} from "Snackbar/SnackbarStore";
import {useCloudAPI} from "Authentication/DataHook";
import {isAbsoluteUrl, useNoFrame} from "UtilityFunctions";
import {useTitle} from "Navigation/Redux/StatusActions";
import {useParams} from "react-router";
import { useEffect } from "react";
import {compute} from "UCloud";
type JobsOpenInteractiveSessionResponse = compute.JobsOpenInteractiveSessionResponse;
import {bulkRequestOf} from "DefaultObjects";

export const Web: React.FunctionComponent = () => {
    const {jobId, rank} = useParams<{ jobId: string, rank: string }>();
    const [sessionResp] = useCloudAPI<JobsOpenInteractiveSessionResponse | null>(
        UCloud.compute.jobs.openInteractiveSession(bulkRequestOf({sessionType: "WEB", id: jobId, rank: parseInt(rank, 10)})),
        null
    );

    useTitle("Redirecting to web interface")
    useNoFrame();

    useEffect(() => {
        if (sessionResp.data !== null && sessionResp.data.sessions.length > 0) {
            const {providerDomain, session} = sessionResp.data.sessions[0];
            if (session.type !== "web") {
                snackbarStore.addFailure(
                    "Unexpected response from UCloud. Unable to open web interface!",
                    false
                );
                return;
            }

            const redirectTo = session.redirectClientTo;
            window.location.href = isAbsoluteUrl(redirectTo) ? redirectTo : providerDomain + redirectTo;
        }
    }, [sessionResp.data]);

    return <div>
        UCloud is currently attempting to redirect you to the web interface of your application.
    </div>;
};

export default Web;
