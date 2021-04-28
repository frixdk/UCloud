import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const Image = withStyledSystemCompatibility([], styled.img`
  max-width: 100%;
  height: auto;
`);

Image.displayName = "Image";

export default Image;
