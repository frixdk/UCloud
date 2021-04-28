import theme from "ui-components/theme";
import Text from "./Text";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const SelectableTextWrapper = withStyledSystemCompatibility([], styled.div`
  display: flex;
  border-bottom: ${theme.borderWidth} solid var(--borderGray);
  cursor: pointer;
`);

const SelectableText = styled(Text) <{ selected: boolean }>`
  border-bottom: ${props => props.selected ? `3px solid var(--blue)` : "0"};
`;

SelectableText.displayName = "SelectableText";

export {SelectableTextWrapper, SelectableText};
