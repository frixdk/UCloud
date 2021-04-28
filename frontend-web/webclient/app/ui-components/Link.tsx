import * as React from "react";
import {Link as ReactRouterLink, LinkProps} from "react-router-dom";
import BaseLink, {BaseLinkProps} from "./BaseLink";
import {StyledSystemProperties} from "styled-system";

const Link = ({active, ...props}: StyledSystemProperties & LinkProps & BaseLinkProps & {active?: boolean}): JSX.Element =>
    <BaseLink as={ReactRouterLink} {...props} />;

export default Link;
