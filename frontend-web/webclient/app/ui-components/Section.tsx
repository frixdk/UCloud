import * as React from "react";
import {styled} from "@linaria/react";

export const Section = styled.section<{ highlight?: boolean, gap?: string }>`
  padding: 16px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  background-color: var(${props => props.highlight ? "--appStoreFavBg" : "--lightGray"}, #f00);
  display: ${props => props.gap === undefined ? "block" : "grid"};
  grid-gap: ${props => props.gap === undefined ? "0" : props.gap};
`;

Section.defaultProps = {
    gap: "16px"
};