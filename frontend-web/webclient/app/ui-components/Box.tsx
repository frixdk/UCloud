import * as React from "react";
import {CSSProperties, useMemo} from "react";
import {ShorthandProps, StyledSystemProperties, translateShorthandCSS} from "styled-system";

const Box = (props) => {
    const style: CSSProperties = useMemo(() => translateShorthandCSS(props), [props]);
    return <div style={style}>{props.children}</div>
};

export default Box;
