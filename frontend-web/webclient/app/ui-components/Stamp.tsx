import styled from "styled-components"
import { themeGet, space, fontSize, color, SpaceProps } from 'styled-system'
import theme, { ThemeColor } from "./theme"
import * as React from "react";
import { Icon, Text } from ".";
import { IconName } from "./Icon";

const fullWidth = ({ fullWidth }: { fullWidth?: boolean }) => fullWidth ? { width: "100%" } : null;

export const colorScheme = (props) => {
  const badgeColors = {
    blue: {
      backgroundColor: props.theme.colors.blue,
      borderColor: props.theme.colors.blue,
      color: props.theme.colors.white
    },
    lightBlue: {
      backgroundColor: props.theme.colors.lightBlue,
      borderColor: props.theme.colors.lightBlue,
      color: props.theme.colors.darkBlue
    },
    green: {
      backgroundColor: props.theme.colors.green,
      borderColor: props.theme.colors.green,
      color: props.theme.colors.white
    },
    lightGreen: {
      backgroundColor: props.theme.colors.lightGreen,
      borderColor: props.theme.colors.lightGreen,
      color: props.theme.colors.darkGreen
    },
    red: {
      backgroundColor: props.theme.colors.red,
      borderColor: props.theme.colors.red,
      color: props.theme.colors.white
    },
    lightRed: {
      backgroundColor: props.theme.colors.lightRed,
      borderColor: props.theme.colors.lightRed,
      color: props.theme.colors.darkRed
    },
    orange: {
      backgroundColor: props.theme.colors.orange,
      borderColor: props.theme.colors.orange,
      color: props.theme.colors.text
    },
    lightOrange: {
      backgroundColor: props.theme.colors.lightOrange,
      borderColor: props.theme.colors.lightOrange,
      color: props.theme.colors.darkOrange
    },
    gray: {
      backgroundColor: props.theme.colors.gray,
      borderColor: props.theme.colors.gray,
      color: props.theme.colors.white
    },
    lightGray: {
      backgroundColor: props.theme.colors.lightGray,
      borderColor: props.theme.colors.lightGray,
      color: props.theme.colors.text
    }
  }
  return (
    badgeColors[props.color]
  )
}

const StampBase = styled.div<StampProps>`
  display: inline-flex;
  align-items: center;
  vertical-align: top;
  min-height: 24px;
  ${fullWidth}
  font-weight: 600;
  letter-spacing: ${themeGet('letterSpacings.caps')};
  border-radius: 4px;
  border-width: 1px;
  border-style: solid;
  ${colorScheme}
  ${space} ${fontSize};
`

StampBase.displayName = "Stamp";

interface StampProps extends SpaceProps {
  color?: ThemeColor
  theme?: any
  fontSize?: number | string
  fullWidth?: boolean
}

StampBase.defaultProps = {
  px: 1,
  py: 0,
  mr: "4px",
  theme,
  color: "black",
  fontSize: 0,
  fullWidth: false
}

const Stamp = (props: StampProps & { icon?: IconName, onClick?: () => void, text: string }) => (
  <StampBase {...props}>
    {props.icon ? <Icon name={props.icon} size={12} /> : null}
    <Text>{props.text}</Text>
    {props.onClick ? <Icon name={"close"} size={12} onClick={props.onClick} /> : null}
  </StampBase>
);

export { StampBase as OldStamp };
export default Stamp;
