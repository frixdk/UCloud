import theme, {CSSVarThemeColor} from "./theme";
import {Cursor} from "./Types";
import {styled} from "@linaria/react";

export const Dropdown = styled.div<DropdownProps>`
  position: relative;
  display: inline-block;
  width: ${p => p.fullWidth ? "100%": "auto"};
  &:hover > div {
    display: ${p => p.hover ? "block" : "none"};
  }
`;

Dropdown.defaultProps = {
    hover: true
};

interface DropdownProps {
    hover?: boolean;
    fullWidth?: boolean;
}

export const DropdownContent = styled.div<DropdownContentProps>`
  overflow: visible;
  overflow-y: auto;
  overflow-x: hidden;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  border-top-left-radius: ${props => props.squareTop ? "0" : "5px"};
  border-top-right-radius: ${props => props.squareTop ? "0" : "5px"};
  display: ${props => props.hover ? "none" : "block"};
  position: absolute;
  background-color: ${p => p.backgroundColor!};
  color: var(--${p => p.color ?? "black"}, #f00);
  width: ${props => props.width ?? "auto"};
  min-width: ${props => props.minWidth ?? "138px"};
  max-height: ${props => props.maxHeight ? props.maxHeight : "auto"};
  padding: 12px 16px;
  z-index: 47;
  text-align: left;
  cursor: ${props => props.cursor ?? "auto"};
  visibility: ${props => props.visible ? "visible" : "hidden"};
  opacity: ${props => props.visible ? 1 : 0};
  pointer-events: ${props => props.visible ? "auto" : "none"};
  box-shadow: ${theme.shadows[1]};

  & > div {
    margin-left: -17px;
    margin-right: -17px;
    padding-left: 17px;
  }
`;

DropdownContent.defaultProps = {
    squareTop: false,
    hover: true,
    width: "138px",
    backgroundColor: "var(--white)",
    color: "black",
    disabled: false,
    cursor: "pointer",
    minWidth: "138px",
    visible: false
};

Dropdown.displayName = "Dropdown";

interface DropdownContentProps {
    hover?: boolean;
    width?: string | number;
    disabled?: boolean;
    minWidth?: string;
    maxHeight?: number | string;
    cursor?: Cursor;
    backgroundColor?: CSSVarThemeColor;
    squareTop?: boolean;
    visible?: boolean;
}
