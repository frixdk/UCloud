import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

export const ButtonGroup = withStyledSystemCompatibility(
    ["height"],
    styled.div<{ height?: string }>`
      display: flex;

      height: ${p => p.height!};

      & button {
        height: 100%;
        width: 100%;
        padding: 0 10px;
        border-radius: 0;
        white-space: nowrap;
      }

      & > button:last-child, .last {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
      }

      & > button:first-child, .first {
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
      }
    `
);

ButtonGroup.displayName = "ButtonGroup";
ButtonGroup.defaultProps = {
    height: "35px"
};

export default ButtonGroup;
