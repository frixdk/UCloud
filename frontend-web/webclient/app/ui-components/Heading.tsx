import * as React from "react";
import Text from "./Text";
import theme from "ui-components/theme";

export const h1 = ({children, ...props}): JSX.Element =>
    (<Text as="h1" bold={true} fontSize={theme.fontSizes[6] + "px"} m={0} {...props}>{children}</Text>);
export const h2 = ({children, ...props}): JSX.Element =>
    (<Text as="h2" bold={true} fontSize={theme.fontSizes[5] + "px"} m={0} {...props}>{children}</Text>);
export const h3 = ({children, ...props}): JSX.Element =>
    (<Text as="h3" regular={true} fontSize={theme.fontSizes[4] + "px"} m={0} {...props}>{children}</Text>);
export const h4 = ({children, ...props}): JSX.Element =>
    (<Text as="h4" regular={true} fontSize={theme.fontSizes[3] + "px"} m={0} {...props}>{children}</Text>);
export const h5 = ({children, ...props}): JSX.Element =>
    (<Text as="h5" bold={props.bold ?? true} fontSize={theme.fontSizes[2] + "px"} m={0} {...props}>{children}</Text>);
export const h6 = ({children, ...props}): JSX.Element =>
    (<Text as="h6" bold={true} caps={true} fontSize={theme.fontSizes[0] + "px"} m={0} {...props}>{children}</Text>);

export default h3;
