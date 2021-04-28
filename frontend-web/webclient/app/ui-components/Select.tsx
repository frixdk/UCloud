import * as React from "react";
import Flex from "./Flex";
import Icon from "./Icon";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";
import theme from "ui-components/theme";
import {StyledSystemProperties} from "styled-system";

const ClickableIcon = styled(Icon)`
  pointer-events: none;
`;

const left = ({leftLabel}: { leftLabel?: boolean }) =>
    leftLabel ? `border-top-left-radius: 0; border-bottom-left-radius: 0;` : "";
const right = ({rightLabel}: { rightLabel?: boolean }) =>
    rightLabel ? `border-top-right-radius: 0; border-bottom-right-radius: 0;` : "";


interface SelectProps {
    error?: boolean;
}

const SelectBase = withStyledSystemCompatibility(
    [],
    styled.select<SelectProps>`
      appearance: none;
      display: block;
      width: 100%;
      font-family: inherit;
      color: inherit;

      & > option {
        color: black;
      }

      &:invalid {
        border-color: var(--red, #f00);
      }

      background-color: transparent;
      border-radius: ${theme.radius};
      border-width: ${theme.borderWidth};
      border-style: solid;
      border-color: ${p => p.error ? "var(--red)" : "var(--borderGray, #f00)"};
      
      &:focus {
        outline: none;
        border-color: var(--blue, #f00);
      }
    `
);

SelectBase.defaultProps = {
    m: 0,
    pl: 12,
    pr: 32,
    py: 7
};

type Props = SelectProps &
    React.SelectHTMLAttributes<HTMLSelectElement> &
    { selectRef?: React.RefObject<HTMLSelectElement> } &
    StyledSystemProperties;

const Select = styled((props: Props) => (
    <Flex width={1} alignItems="center">
        <SelectBase {...props} ref={props.selectRef}/>
        <ClickableIcon ml={-32} name="chevronDown" color="gray" size="0.7em"/>
    </Flex>
))``;

export default Select;
