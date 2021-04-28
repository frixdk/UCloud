import * as React from "react";
import Icon, {IconName} from "ui-components/Icon";
import {themeColor, ThemeColor} from "ui-components/theme";
import {JobState} from "Applications/Jobs/index";
import {StyledSystemProperties} from "styled-system";

export const JobStateIcon: React.FunctionComponent<{
    state?: JobState;
    isExpired: boolean;
    size?: number | string;
    color?: ThemeColor;
} & StyledSystemProperties> = ({isExpired, ...props}) => {
    if (!props.state) return null;
    let iconName: IconName;
    // let defaultColor: ThemeColor = "iconColor";
    let defaultColor;

    if (isExpired) {
        return (
            // @ts-ignore
            <Icon
                name="chrono"
                color={themeColor("orange")}
                size={props.size}
                {...props}
            />
        );
    }

    switch (props.state) {
        case "IN_QUEUE":
            iconName = "calendar";
            break;
        case "RUNNING":
            iconName = "chrono";
            break;
        /*
        case JobState.READY:
            iconName = "chrono";
            defaultColor = "green";
            break;
         */
        case "SUCCESS":
            iconName = "check";
            defaultColor = "green";
            break;
        case "FAILURE":
            iconName = "close";
            defaultColor = "red";
            break;
        case "EXPIRED":
            iconName = "chrono";
            defaultColor = "orange";
            break;
        default:
            iconName = "ellipsis";
            break;
    }

    const color = props.color !== undefined ? props.color : defaultColor;

    return (
        // @ts-ignore
        <Icon
            name={iconName}
            color={color ? themeColor(color) : undefined}
            size={props.size}
            {...props}
        />
    );
};
