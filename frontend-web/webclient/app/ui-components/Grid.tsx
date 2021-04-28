import * as React from "react";
import {styled} from "@linaria/react";
import {StyledSystemProperties} from "styled-system";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const Grid = withStyledSystemCompatibility([], styled.div`
  display: grid;
`);

export const GridCardGroup = (
    {
        minmax = 400,
        gridGap = 10,
        ...props
    }
): JSX.Element => (
    <Grid
        mt="2px"
        width="100%"
        gridGap={gridGap}
        gridTemplateColumns={`repeat(auto-fill, minmax(${minmax}px, 1fr))`}
        {...props}
    />
);

Grid.displayName = "Grid";

export default Grid;
