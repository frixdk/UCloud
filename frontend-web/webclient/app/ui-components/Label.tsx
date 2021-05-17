import styled from "styled-components";
import {
  color, ColorProps, fontSize, FontSizeProps,
  FontStyleProps, fontWeight, FontWeightProps,
  maxWidth,
  MaxWidthProps,
  space, SpaceProps, width, WidthProps
} from "styled-system";

const nowrap = (props: {nowrap?: boolean}): {whiteSpace: "nowrap"} | null =>
  props.nowrap ? {
    whiteSpace: "nowrap"
  } : null;

type accessiblyHide = {
  position: "absolute";
  width: "1px";
  height: "1px";
  clip: "rect(1px, 1px, 1px, 1px)";
} | null;
const accessiblyHide = (props: {hidden?: boolean}): accessiblyHide =>
  props.hidden ? {
    position: "absolute",
    width: "1px",
    height: "1px",
    clip: "rect(1px, 1px, 1px, 1px)"
  } : null;

export type LabelProps =
  SpaceProps & FontSizeProps & FontStyleProps & ColorProps & FontWeightProps & WidthProps & MaxWidthProps
  & {nowrap?: boolean; hidden?: boolean};

const Label = styled.label <LabelProps>`
  font-size: 10px;
  letter-spacing: 0.2px;
  display: block;
  margin: 0;

  ${space} ${fontSize} ${color} ${fontWeight};
  ${nowrap} ${width}
  ${accessiblyHide}
  ${maxWidth}
`;

Label.defaultProps = {
  width: "100%",
  fontSize: 1,
  fontWeight: "bold",
  color: "black"
};

Label.displayName = "Label";

export default Label;
