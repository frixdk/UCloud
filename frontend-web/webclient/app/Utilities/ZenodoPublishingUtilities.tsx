import * as React from "react";
import { Cloud } from "Authentication/SDUCloudObject";
import { Button } from "ui-components";
import { failureNotification } from "UtilityFunctions";



const zenodoRedirectPath = (returnTo: string) => `/zenodo/request?returnTo=${encodeURIComponent(returnTo)}`;

const ZenodoRedirect = () =>
    Cloud.post(zenodoRedirectPath(window.location.href)).then(({ response }) => {
        const redirectTo = response.redirectTo;
        if (redirectTo) window.location.href = redirectTo;
    }).catch(() => failureNotification(`An error occurred redirecting to ${window.location.href}`))
        
export const NotConnectedToZenodo = () => (
    <>
        <h1>You are not connected to Zenodo</h1>
        <Button onClick={() => ZenodoRedirect()}>Connect to Zenodo</Button>
    </>
);