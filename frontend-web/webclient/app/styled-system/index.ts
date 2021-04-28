import {Property as CSS, StandardProperties, Globals} from "csstype";
import {CSSProperties} from "react";

/**
 * Converts shorthand margin and padding props to margin and padding CSS declarations
 *
 * - Numbers from 0-4 (or the length of theme.space) are converted to values on the spacing scale.
 * - Negative values can be used for negative margins.
 * - Numbers greater than the length of the theme.space array are converted to raw pixel values.
 * - String values are passed as raw CSS values.
 * - Array values are converted into responsive values.
 */

export interface ShorthandProps {
    /** Margin on top, left, bottom and right */
    m?: CSS.Margin<number>;
    /** Margin for the top */
    mt?: CSS.MarginTop<number>;
    /** Margin for the right */
    mr?: CSS.MarginRight<number>;
    /** Margin for the bottom */
    mb?: CSS.MarginBottom<number>;
    /** Margin for the left */
    ml?: CSS.MarginLeft<number>;
    /** Margin for the left and right */
    mx?: CSS.Padding<number>;
    /** Margin for the top and bottom */
    my?: CSS.Padding<number>;
    /** Padding on top, left, bottom and right */
    p?: CSS.Padding<number>;
    /** Padding for the top */
    pt?: CSS.PaddingTop<number>;
    /** Padding for the right */
    pr?: CSS.PaddingRight<number>;
    /** Padding for the bottom */
    pb?: CSS.PaddingBottom<number>;
    /** Padding for the left */
    pl?: CSS.PaddingLeft<number>;
    /** Padding for the left and right */
    px?: CSS.Padding<number>;
    /** Padding for the top and bottom */
    py?: CSS.Padding<number>;
}

export type StyledSystemProperties = CSSProperties & ShorthandProps;

export function translateShorthandCSS(props: StyledSystemProperties, mergeWith?: CSSProperties): CSSProperties {
    const result = {...props};
    translateSingleShorthandProperty("p", ["padding"], result);
    translateSingleShorthandProperty("px", ["paddingLeft", "paddingRight"], result);
    translateSingleShorthandProperty("py", ["paddingTop", "paddingBottom"], result);
    translateSingleShorthandProperty("pl", ["paddingLeft"], result);
    translateSingleShorthandProperty("pr", ["paddingRight"], result);
    translateSingleShorthandProperty("pb", ["paddingBottom"], result);
    translateSingleShorthandProperty("pt", ["paddingTop"], result);

    translateSingleShorthandProperty("m", ["margin"], result);
    translateSingleShorthandProperty("mx", ["marginLeft", "marginRight"], result);
    translateSingleShorthandProperty("my", ["marginTop", "marginBottom"], result);
    translateSingleShorthandProperty("ml", ["marginLeft"], result);
    translateSingleShorthandProperty("mr", ["marginRight"], result);
    translateSingleShorthandProperty("mb", ["marginBottom"], result);
    translateSingleShorthandProperty("mt", ["marginTop"], result);

    if (mergeWith !== undefined) {
        for (const key of Object.keys(mergeWith)) {
            result[key] = mergeWith[key];
        }
    }

    return result;
}

function translateSingleShorthandProperty(shorthand: string, cssProps: string[], mutableProps: any) {
    if (shorthand in mutableProps) {
        let value = mutableProps[shorthand];
        delete mutableProps[shorthand];
        if (typeof value === "number") value = value.toString() + "px";
        for (const cssProp of cssProps) {
            mutableProps[cssProp] = value;
        }
    }
}