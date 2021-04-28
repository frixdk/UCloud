import {withStyledSystemCompatibility} from "ui-components/Compatibility";
import {styled} from "@linaria/react";

const Container = withStyledSystemCompatibility([], styled.div<{ maxWidth?: number }>`
  margin-left: auto;
  margin-right: auto;
`);

Container.displayName = "Container";

export default Container;
