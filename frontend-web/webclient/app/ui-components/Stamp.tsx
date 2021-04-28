import * as React from "react";
import Icon, {IconName} from "./Icon";
import theme, {Theme, ThemeColor} from "./theme";
import {styled} from "@linaria/react";
import {default as Text} from "./Text";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";
import {StyledSystemProperties} from "styled-system";

/*
export const colorScheme = (props: { theme: Theme; color: ThemeColor }) => {
    const badgeColors = {
        white: {
            backgroundColor: props.theme.colors.black,
            borderColor: props.theme.colors.black,
            color: props.theme.colors.black
        },
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
    };
    const color = badgeColors[props.color];
    return color || badgeColors.white;
};

 */

const StampBase = withStyledSystemCompatibility(["fullWidth"], styled.div<{ fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  vertical-align: top;
  min-height: 24px;
  font-weight: 600;
  letter-spacing: ${theme.letterSpacings.caps};
  border-radius: 4px;
  border-width: 1px;
  border-style: solid;
  width: ${p => p.fullWidth ? "100%" : "auto"};
  
  background-color: var(--black);
  border-color: var(--black);
  color: var(--black);
`);

StampBase.displayName = "Stamp";

interface StampProps {
    color?: ThemeColor;
    theme?: Theme;
    fontSize?: number | string;
    fullWidth?: boolean;
}

StampBase.defaultProps = {
    px: 1,
    py: 0,
    mr: "4px",
    color: "gray",
    fontSize: 0,
    fullWidth: false
};

const Stamp = (props: StyledSystemProperties & StampProps & { icon?: IconName; onClick?: () => void; text: string }): JSX.Element => (
    // @ts-ignore
    <StampBase {...props}>
        {props.icon ? <Icon name={props.icon} size={12}/> : null}
        <Text ml="4px" mr="6px">{props.text}</Text>
        {props.onClick ? <Icon name={"close"} size={12} onClick={props.onClick}/> : null}
    </StampBase>
);

export default Stamp;
