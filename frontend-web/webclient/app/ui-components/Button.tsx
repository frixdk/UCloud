import {styled} from "@linaria/react";
import theme, {CSSVarThemeColor, ThemeColor} from "ui-components/theme";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";
import {css} from "@linaria/core";

export const fullWidth = (props: { fullWidth?: boolean }): any => props.fullWidth ? {width: "100%"} : null;

export interface ButtonProps {
    fullWidth?: boolean;
    textColor?: CSSVarThemeColor;
    color?: CSSVarThemeColor;
    lineHeight?: number | string;
    title?: string;
    attached?: boolean;
    asSquare?: boolean;
}

export const ButtonStyle = css`
  font-smoothing: antialiased;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  text-decoration: none;
  font-family: inherit;
  font-weight: ${theme.bold};
  line-height: 1.5;
  cursor: pointer;
  border-width: 0;
  border-style: solid;
  transition: ${theme.timingFunctions.easeInOut} ${theme.transitionDelays.small};

  &:disabled {
    opacity: 0.25;
  }

  &:focus {
    outline: none;
  }

  &:hover {
    transform: translateY(-2px);
  }
  padding: 9.5px 18px;
  font-size: ${theme.fontSizes[1]}px;
`;

const Button = withStyledSystemCompatibility(
    ["fullWidth", "textColor", "color", "lineHeight", "title", "attached", "asSquare"],
    styled.button<ButtonProps>`
      background-color: ${p => p.color!};
      color: ${p => p.textColor!};

      width: ${p => p.fullWidth ? "100%" : "unset"};
      border-radius: ${p => p.asSquare ? "0" : theme.radius};
      border-top-left-radius: ${p => p.attached ? "0" : theme.radius};
      border-bottom-left-radius: ${p => p.attached ? "0" : theme.radius};
    `,
    ButtonStyle
);

Button.defaultProps = {
    textColor: "var(--white)",
    color: "var(--blue)",
    lineHeight: 1.5,
    fullWidth: false,
    attached: false,
    asSquare: false
};

Button.displayName = "Button";

export default Button;
