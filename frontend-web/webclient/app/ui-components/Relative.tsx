import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const Relative = withStyledSystemCompatibility([], styled.div`
  position: relative;
`);

Relative.displayName = "Relative";

export default Relative;
