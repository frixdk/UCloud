import * as React from "react";
import * as UCloud from "UCloud";
import {useCallback, useEffect, useState} from "react";
import {useCloudCommand} from "Authentication/DataHook";
import {Button} from "ui-components";

export const FavoriteToggle: React.FunctionComponent<{
    application: UCloud.compute.ApplicationWithFavoriteAndTags
}> = ({application}) => {
    const [loading, invokeCommand] = useCloudCommand();
    const [favorite, setFavorite] = useState(application.favorite);
    useEffect(() => {
        setFavorite(application.favorite);
    }, [application]);

    const toggle = useCallback(async () => {
        if (!loading) {
            setFavorite(!favorite);
            invokeCommand(UCloud.compute.apps.toggleFavorite({
                appName: application.metadata.name,
                appVersion: application.metadata.version
            }));
        }
    }, [loading, favorite]);

    return <Button onClick={toggle} fullWidth>
        {favorite ? "Remove from favorites" : "Add to favorites"}
    </Button>
}
