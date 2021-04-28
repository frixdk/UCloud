import {StyledSystemProperties, translateShorthandCSS} from "styled-system";
import {CSSProperties, useMemo} from "react";
import * as React from "react";

export function withStyledSystemCompatibility<P>(
    keysToRemove: string[],
    Component: React.ComponentType<P & { style?: CSSProperties, className?: string }>,
    className?: string
): React.FunctionComponent<Omit<P, "new"> & StyledSystemProperties> {
    return (props) => {
        const style: CSSProperties = useMemo(() => {
            const copy = {...props};
            for (const key of keysToRemove) {
                delete copy[key];
            }
            return translateShorthandCSS(copy);
        }, [props]);
        //@ts-ignore
        return <Component {...props} style={style} className={(props["className"] ?? "") + " " + className} />;
    };
}
