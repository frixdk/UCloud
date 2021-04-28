import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const VerticalButtonGroup = withStyledSystemCompatibility([], styled.div`
  display: flex;
  height: 98%;
  flex-direction: column;

  //leave some space on top if buttons grow on hover
  margin-top: 4px;

  & button {
    width: 100%;
    margin-bottom: 8px;
  }
`);


VerticalButtonGroup.displayName = "VerticalButtonGroup";

export default VerticalButtonGroup;
