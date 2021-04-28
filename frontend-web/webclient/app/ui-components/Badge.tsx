import theme, {Theme, ThemeColor} from "./theme";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const Badge = withStyledSystemCompatibility(["color", "bg"], styled.div<{ color?: ThemeColor, bg?: string }>`
  border-radius: 99999px;
  display: inline-block;
  font-size: ${theme.fontSizes[0]}px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: ${theme.letterSpacings.caps};
  background-color: var(--red);
  color: white;
`);

Badge.displayName = "Badge";

Badge.defaultProps = {
    px: 2,
    py: 1
};

const DevelopmentBadgeBase = styled(Badge)`
  background-color: var(--red, #f00);
  margin: 15px 25px 14px 5px;
  color: white;

  @keyframes badge-fade-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  animation: badge-fade-in 1.5s ease 1.5s infinite alternate;
  animation-direction: alternate;
`;

export default Badge;

export {DevelopmentBadgeBase};
