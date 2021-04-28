import * as React from "react";
import Box from "./Box";
import Flex from "./Flex";
import Text from "./Text";
import {CSSVarThemeColor, themeColor, ThemeColor} from "./theme";
import {styled} from "@linaria/react";

interface ProgressBaseProps {
    color: CSSVarThemeColor;
    height: string;
    width: string;
}

const ProgressBase = styled.div<ProgressBaseProps>`
  border-radius: 5px;
  background-color: ${p => p.color};
  height: ${p => p.height};
  width: ${p => p.width};
`;

const ProgressPulse = styled(ProgressBase) <{ active: boolean }>`
  display: ${p => p.active ? "block" : "none"};
  width: 100%;
  height: 100%;
  /* From semantic-ui-css */
  animation: progress-active 2s ease infinite;
  color: black;

  @keyframes progress-active {
    0% {
      opacity: 0.3;
      width: 0;
    }
    100% {
      opacity: 0;
      width: 100%;
    }
  }
`;

ProgressBase.defaultProps = {
    color: "var(--green)",
    height: "30px",
};

interface Progress {
    color: ThemeColor;
    percent: number;
    active: boolean;
    label: string;
}

const Progress = ({color, percent, active, label}: Progress): JSX.Element => (
    <>
        <ProgressBase height="30px" width="100%" color={themeColor("lightGray")}>
            <ProgressBase height="30px" color={themeColor(color)} width={`${percent}%`}>
                <ProgressPulse active={active} width="100%" height={"30px"} color={themeColor(color)}/>
            </ProgressBase>
        </ProgressBase>
        {label ? <Flex justifyContent="center"><Text>{label}</Text></Flex> : null}
    </>
);

ProgressBase.displayName = "ProgressBase";

export default Progress;
