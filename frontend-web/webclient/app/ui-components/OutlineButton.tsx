import theme, {CSSVarThemeColor, Theme} from "./theme";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const OutlineButton = withStyledSystemCompatibility(
    [],
    styled.button<{color?: CSSVarThemeColor, fullWidth?: boolean;}>`
      color: ${p => p.color!};
      border: 2px solid ${p => p.color!};
      border-radius: ${theme.radius};
      background-color: transparent;
      width: ${p => p.fullWidth ? "100%" : "auto"};
      
      &:disabled {
        color: var(--gray);
        border: 2px solid var(--gray);
      }

      &:hover {
        background-color: transparent;
        transition: ease 0.1s;
      }
    `
);

OutlineButton.defaultProps = {
    color: "var(--blue)"
};

OutlineButton.displayName = "OutlineButton";

export default OutlineButton;
