import * as React from "react";
import Text from "ui-components/Text";
import {styled} from "@linaria/react";

const HeaderStyle = styled(Text)`
    > small {
        padding-left: 10px;
        font-size: 50%;
    }
`;

export const Header: React.FunctionComponent<{ name: string, version: string }> = props => (
    <HeaderStyle as={"h1"}>
        {props.name}
        <small>v. {props.version}</small>
    </HeaderStyle>
);
