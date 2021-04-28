import {styled} from "@linaria/react";
import theme from "ui-components/theme";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const Label = withStyledSystemCompatibility(["nowrap"], styled.label<{nowrap?: boolean}>`
  font-size: 10px;
  letter-spacing: 0.2px;
  display: block;
  margin: 0;
  white-space: ${p => p.nowrap ? "wrap" : "normal"};
  width: 100%;
  font-weight: ${theme.bold};
  color: var(--black);
`);

Label.displayName = "Label";

export default Label;
