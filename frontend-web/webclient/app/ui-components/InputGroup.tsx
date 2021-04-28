import {InputStyle} from "./Input";
import theme from "./theme";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

export type InputGroupProps = any;

const InputGroup = withStyledSystemCompatibility([], styled.div<InputGroupProps>`
  display: flex;
  align-items: center;
  border-radius: ${theme.radius};
  border-width: 1px;
  border-style: solid;
  border-color: var(--borderGray);

  & > input {
    width: 100%;
    flex: 1 1 auto;
  }

  & ${InputStyle} {
    border: 0;
    box-shadow: none;
  }
`);

InputGroup.displayName = "InputGroup";

export default InputGroup;
