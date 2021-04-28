import * as React from "react";
import {StyledSystemProperties, translateShorthandCSS} from "styled-system";
import {CSSProperties, useMemo} from "react";

const Absolute = (props) => {
    const style: CSSProperties = useMemo(() => translateShorthandCSS(props, {position: "absolute"}), [props]);
    return <div style={style}>{props.children}</div>
};

export default Absolute;
