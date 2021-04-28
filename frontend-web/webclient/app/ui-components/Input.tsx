import Text from "./Text";
import {styled} from "@linaria/react";
import {css} from "@linaria/core";
import theme, {CSSVarThemeColor} from "ui-components/theme";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

export const borders = ({color, theme, noBorder}: any): any => {
    if (noBorder) return {"border-width": "0px"};
    const borderColor = color ? theme.colors[color] : theme.colors.borderGray;
    const focusColor = color ? borderColor : theme.colors.blue;
    return {
        "border-width": theme.borderWidth,
        "border-color": borderColor,
        "border-style": "solid",
        ":focus": {
            "outline": 0,
            "border-color": focusColor,
        }
    };
};

interface InputProps {
    leftLabel?: boolean;
    rightLabel?: boolean;
    noBorder?: boolean;
    error?: boolean;
}

export const InputStyle = css`
  display: block;
  font-family: inherit;
  color: var(--black, #f00);
  background-color: transparent;
  border-width: ${theme.borderWidth};
  border-color: var(--borderGray);
  border-style: solid;
  border-radius: ${theme.radius};
  padding: 7px 12px;
  width: 100%;

  margin: 0;

  &:invalid {
    border-color: var(--red, #f00);
  }

  ::placeholder {
    color: var(--gray, #f00);
  }

  &:focus {
    outline: none;
    background-color: transparent;
  }

  &:disabled {
    background-color: var(--lightGray, #f00);
  }

`;

const Input = withStyledSystemCompatibility(
    ["leftLabel", "rightLabel", "noBorder", "error"],
    styled.input<InputProps>`
      border-top-left-radius: ${p => p.leftLabel ? "0" : theme.radius};
      border-bottom-left-radius: ${p => p.leftLabel ? "0" : theme.radius};
      border-top-right-radius: ${p => p.rightLabel ? "0" : theme.radius};
      border-bottom-right-radius: ${p => p.rightLabel ? "0" : theme.radius};
      border-width: ${p => p.noBorder ? "0" : theme.borderWidth};
      border-color: ${p => p.error ? "var(--red)" : "inherit"};
    `,
    InputStyle
);

Input.displayName = "Input";

Input.defaultProps = {
    id: "default",
    noBorder: false,
};

export const HiddenInputField = styled(Input)`
  display: none;
`;

export default Input;

export interface InputLabelProps {
    leftLabel?: boolean;
    rightLabel?: boolean;
    independent?: boolean;
}

export const InputLabel = styled(Text) <InputLabelProps>`
  // border: {theme.colors.borderGray} solid {theme.borderWidth};
  /*
  {independent}
  {leftLabel}
  {rightLabel}
  {width}
   */
  padding-left: 1em;
  padding-right: 1em;
  padding-top: 6px;
`;
