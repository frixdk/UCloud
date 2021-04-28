import * as React from "react";
import {HiddenInputField} from "./Input";
import Label from "./Label";
import {CSSVarThemeColor} from "./theme";
import {styled} from "@linaria/react";
import {CSSProperties} from "react";

// https://www.w3schools.com/howto/howto_css_switch.asp
const ToggleLabel = styled(Label)`
  position: relative;
  display: inline-block;
  --scale: 1;
  width: calc(var(--scale) * 30px);
  height: calc(var(--scale) * 17px);
`;

ToggleLabel.displayName = "ToggleLabel";

const RoundSlider = styled.span<{ scale: number; disabledColor: CSSVarThemeColor }>`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${p => p.disabledColor ?? "var(--gray)"};
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 34px;
  --scale: 1;

  &:before {
    position: absolute;
    content: "";
    height: calc(var(--scale) * 13px);
    width: calc(var(--scale) * 13px);
    left: calc(var(--scale) * 2px);
    bottom: calc(var(--scale) * 2px);
    background-color: white;
    -webkit-transition: .4s;
    transition: .4s;
    border-radius: 50%;
  }
`;

RoundSlider.displayName = "RoundSlider";

const ToggleInput = styled(HiddenInputField)`
  --scale: 1;
  &:checked + span {
    background-color: var(--blue);
  }

  &:focus + span {
    box-shadow: 0 0 1px var(--blue);
  }

  &:checked + span:before {
    transform: translateX(calc(var(--scale) * 13px));
  }
`;

ToggleInput.displayName = "ToggleInput";

interface ToggleProps {
    checked?: boolean;
    onChange: () => void;
    scale?: number;
    activeColor?: CSSVarThemeColor;
    disabledColor?: CSSVarThemeColor;
}

export const Toggle: React.FC<ToggleProps> = (
    {
        checked,
        onChange,
        scale = 1,
        activeColor = "var(--blue)",
        disabledColor = "var(--gray)"
    }
) => (
    <ToggleLabel scale={scale}>
        <ToggleInput scale={scale} type="checkbox" checked={checked} onChange={onChange} />
        <RoundSlider disabledColor={disabledColor} scale={scale}/>
    </ToggleLabel>
);
