import * as React from "react";
import BaseLink from "./BaseLink";
import {BaseLinkProps} from "./BaseLink";
import {StyledSystemProperties} from "styled-system";

type AAttr = React.AnchorHTMLAttributes<HTMLAnchorElement>;

const ExternalLink: React.FunctionComponent<
    StyledSystemProperties & BaseLinkProps & Pick<AAttr, Exclude<keyof AAttr, "rel" | "target">>
> = props => <BaseLink rel="noopener" target="_blank" {...props} />;

ExternalLink.defaultProps = {
    color: "text",
    hoverColor: "var(--textHighlight)"
};

export default ExternalLink;
