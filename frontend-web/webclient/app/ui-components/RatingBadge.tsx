import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const RatingBadge = withStyledSystemCompatibility([], styled.div`
  display: inline-block;
  line-height: 1.5;
`);

RatingBadge.defaultProps = {
    fontWeight: "bold",
    px: 2,
    color: "white",
    background: "var(--blue)",
    borderRadius: "0.3em"
};

RatingBadge.displayName = "RatingBadge";

export default RatingBadge;
