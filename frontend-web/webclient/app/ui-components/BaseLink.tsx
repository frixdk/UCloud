import {styled} from "@linaria/react";
import {CSSVarThemeColor} from "ui-components/theme";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

export interface BaseLinkProps {
    hoverColor?: CSSVarThemeColor;
}

const BaseLink = withStyledSystemCompatibility(
    ["hoverColor"],
    styled.a<BaseLinkProps>`
      cursor: pointer;
      text-decoration: none;
      color: var(--text);

      &:hover {
        color: ${p => p.hoverColor!};
      }
    `
);

BaseLink.defaultProps = {
    hoverColor: "var(--textHighlight)"
};

BaseLink.displayName = "BaseLink";

export default BaseLink;
