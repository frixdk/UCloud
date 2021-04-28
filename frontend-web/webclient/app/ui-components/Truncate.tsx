import Text, {TextProps} from "./Text";
import {styled} from "@linaria/react";

const Truncate = styled(Text)`
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`;

Truncate.displayName = "Truncate";

export default Truncate;
