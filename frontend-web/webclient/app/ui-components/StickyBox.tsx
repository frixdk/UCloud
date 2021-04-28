import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

export const StickyBox = withStyledSystemCompatibility(
    ["shadow", "normalMarginX"],
    styled.div<{ shadow?: boolean, normalMarginX?: string }>`
      position: sticky;
      background: var(--white, #f00);

      margin-left: ${p => p.normalMarginX ?? "0"};
      padding-left: ${p => p.normalMarginX ?? "0"};
      padding-right: ${p => p.normalMarginX ?? "0"};
      width: calc(100% + ${p => p.normalMarginX ?? "0"} * 2);

      box-shadow: ${p => p.shadow === true ? "0 1px 5px 0 rgba(0, 0, 0, 0.2)" : "none"};
    `
);

StickyBox.defaultProps = {
    py: "20px",
    top: "-20px",
    zIndex: 1000,
    normalMarginX: "0px"
};