import {MainContainer} from "MainContainer/MainContainer";
import * as React from "react";
import {EveryIcon} from "ui-components/Icon";
import {Grid, Box} from "ui-components";
import {themeColor, ThemeColor} from "ui-components/theme";
import {ConfirmationButton} from "ui-components/ConfirmationAction";
import {getCssVar} from "ui-components/Utils";

export const Playground: React.FunctionComponent = () => {
    const main = (
        <>
            <Grid gridTemplateColumns={"repeat(5, 1fr)"} mb={"32px"}>
                <EveryIcon/>
            </Grid>
            <Grid
                gridTemplateColumns="repeat(10, 1fr)"
                overflowY={"scroll"}
                mb={"32px"}
            >
                {colors.map((c: ThemeColor) => (
                    <Box
                        title={`${c}, ${getCssVar(c)}`}
                        key={c}
                        background={c}
                        height={"100px"}
                        width={"100%"}
                    />
                ))}
            </Grid>

            <ConfirmationButton icon={"trash"} actionText={"Delete"} color={themeColor("red")}/>
        </>
    );
    return <MainContainer main={main}/>;
};

const colors = [
    "black",
    "white",
    "textBlack",
    "lightGray",
    "midGray",
    "gray",
    "darkGray",
    "lightBlue",
    "lightBlue2",
    "blue",
    "darkBlue",
    "lightGreen",
    "green",
    "darkGreen",
    "lightRed",
    "red",
    "darkRed",
    "orange",
    "darkOrange",
    "lightPurple",
    "purple",
    "yellow",
    "text",
    "textHighlight",
    "headerText",
    "headerBg",
    "headerIconColor",
    "headerIconColor2",
    "borderGray",
    "paginationHoverColor",
    "paginationDisabled",
    "iconColor",
    "iconColor2",
    "FtIconColor",
    "FtIconColor2",
    "FtFolderColor",
    "FtFolderColor2",
    "spinnerColor",
    "tableRowHighlight",
    "appCard",
    "wayfGreen",
];

export default Playground;
