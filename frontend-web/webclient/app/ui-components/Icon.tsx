import * as CSS from "csstype";
import * as React from "react";
import Bug from "./Bug";
import * as icons from "./icons";
import theme, {ThemeColor} from "./theme";
import {styled} from "@linaria/react";
import {getCssVar} from "ui-components/Utils";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const IconBase = ({name, size, squared, color2, spin, hoverColor, ...props}: IconBaseProps): JSX.Element => {
    let Component = icons[name];
    if (!Component) {
        if (name === "bug") {
            Component = Bug;
        } else {
            return (<></>);
        }
    }

    return (
        <Component
            width={size}
            height={squared ? size : undefined}
            color2={color2 ? color2 : undefined}
            {...props}
        />
    );
};

export interface IconBaseProps extends React.SVGAttributes<HTMLDivElement> {
    name: IconName | "bug";
    color?: string;
    color2?: string;
    rotation?: number;
    cursor?: CSS.Property.Cursor;
    size?: string | number;
    squared?: boolean;
    spin?: boolean;
    hoverColor?: CSS.Property.Color;
    title?: string;
}

const Icon = withStyledSystemCompatibility(
    ["name", "color", "color2", "rotation", "cursor", "size", "squared", "spin", "hoverColor", "title"],
    styled(IconBase) <IconBaseProps>`
      flex: none;
      vertical-align: middle;
      cursor: ${props => props.cursor ?? "auto"};
      transform: rotate(${props => props.rotation ?? 0} deg);
      animation: ${p => p.spin ? "spin 1s linear infinite" : "none"};
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      &:hover {
        color: ${p => p.hoverColor ?? "unset"};
      }
    `
);

Icon.displayName = "Icon";

Icon.defaultProps = {
    cursor: "inherit",
    name: "notification",
    size: 24,
    squared: true
};

// Use to see every available icon in debugging.
export const EveryIcon = (): JSX.Element => (
    <>
        {Object.keys(icons).map((it: IconName, i: number) =>
            (<span key={i}><span>{it}</span>: <Icon name={it} key={i}/></span>)
        )}
    </>
);

export type IconName = Exclude<keyof typeof icons, "bug1" | "bug2" | "bug3" | "bug4" | "bug5" | "bug6"> | "bug";

export default Icon;
