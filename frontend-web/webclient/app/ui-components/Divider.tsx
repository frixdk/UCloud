import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const Divider = withStyledSystemCompatibility([], styled.hr`
  border: 0;
  border-bottom-style: solid;
  border-bottom-width: 1px;
`);

Divider.displayName = "Divider";

Divider.defaultProps = {
    borderColor: "var(--borderGray)",
    ml: 0,
    mr: 0
};

export default Divider;
