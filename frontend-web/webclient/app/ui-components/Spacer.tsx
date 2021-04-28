import * as React from "react";

import Box from "./Box";
import Flex from "./Flex";
import {StyledSystemProperties} from "styled-system";

interface SpacerProps {
    left: Element | React.ReactNode | null;
    right: Element | React.ReactNode | null;
}

export const Spacer = ({left, right, ...props}: SpacerProps & StyledSystemProperties) => (
    <Flex {...props}>
        {left}
        <Box ml="auto"/>
        {right}
    </Flex>
);
