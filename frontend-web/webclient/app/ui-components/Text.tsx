import * as React from "react";
import theme, {Theme} from "./theme";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

export interface TextProps {
    caps?: boolean;
    regular?: boolean;
    italic?: boolean;
    bold?: boolean;
    selectable?: boolean;
}

const Text = withStyledSystemCompatibility(
    ["caps", "regular", "italic", "bold", "selectable"],
    styled.div<TextProps>`
      user-select: ${p => p.selectable === false ? "none" : "auto"};
      text-transform: ${p => p.caps ? "uppercase" : "none"};
      font-weight: ${p => p.bold ? theme.bold : theme.regular};
      font-style: ${p => p.italic ? "italic" : "normal"};
    `
);

export const TextDiv = Text;
export const TextSpan = (props: any) => <Text as="span" {...props} />;
export const TextP = (props: any) => <Text as="p" {...props} />;

type EllipsedTextProps = TextProps;
export const EllipsedText = styled(Text) <EllipsedTextProps>`
  user-select: ${p => p.selectable === false ? "none" : "auto"};
  text-transform: ${p => p.caps ? "uppercase" : "none"};
  font-weight: ${p => p.bold ? theme.bold : theme.regular};
  font-style: ${p => p.italic ? "italic" : "normal"};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: bottom;
`;

EllipsedText.displayName = "EllipsedText";

Text.defaultProps = {
    cursor: "inherit"
};

Text.displayName = "Text";

export default Text;
