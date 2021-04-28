import theme, {borderWidth} from "./theme";
import * as React from "react";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";
import {StyledSystemProperties} from "styled-system";
import {css} from "@linaria/core";

export const CardStyle = css`
  border-color: var(--borderGray);
  border-radius: ${theme.radius};
  border-width: 2px;
`;
export const Card = withStyledSystemCompatibility([], styled.div``, CardStyle);

Card.displayName = "Card";

export default Card;
