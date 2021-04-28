import * as React from "react";
import {StyledSystemProperties, translateShorthandCSS} from "styled-system";
import {CSSProperties, useMemo} from "react";

const Flex = (props) => {
  const style: CSSProperties = useMemo(() => translateShorthandCSS(props, {display: "flex"}), [props]);
  return <div style={style}>{props.children}</div>
};

Flex.displayName = "Flex";

export default Flex;
