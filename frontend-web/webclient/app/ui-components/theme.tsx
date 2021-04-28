const createMinMediaQuery = (n: number): string => `@media screen and (min-width:${n}px)`;
const createMaxMediaQuery = (n: number): string => `@media screen and (max-width:${n - 1}px)`;

const addAliases = (arr: any, al: any[]): void =>
    al.forEach((key, i) =>
        Object.defineProperty(arr, key, {
            enumerable: false,
            get() {
                return this[i];
            }
        })
    );

// export const breakpoints = [32, 40, 48, 64, 80].map(n => n + 'em')
const bp = [512, 640, 768, 1024, 1280];
const aliases = ["xs", "sm", "md", "lg", "xl"];
export const breakpoints = bp.map(n => n + "px");
export const responsiveBP = bp.map((n, i) => ({[aliases[i]!]: n - 1})).reduce((obj, item) => ({...obj, ...item}), {});
// export const responsiveBP = { xs: 512-1, sm: 640-1, md: 768-1, lg: 1024-1, xl: 1280-1 }

export const mediaQueryGT = bp.map(createMinMediaQuery);
export const mediaQueryLT = bp.map(createMaxMediaQuery);
addAliases(breakpoints, aliases);
addAliases(mediaQueryGT, aliases);
addAliases(mediaQueryLT, aliases);

export const space = [0, 4, 8, 16, 32, 64, 128];

export const fontFamily = `'IBM Plex Sans', sans-serif`;

export const fontSizes = [10, 14, 16, 20, 24, 32, 40, 56, 72];

export const medium = 300;
export const bold = 700;
export const regular = 400;

// styled-system's `fontWeight` function can hook into the `fontWeights` object
export const fontWeights = {
    medium,
    bold,
    regular
};

export const lineHeights = {
    standard: 1.5,
    display: 1.25
};

const letterSpacings = {
    normal: "normal",
    caps: "0.025em"
};


// Colors in the array come in 3 shades: light, medium , dark
// last color is for logo centers only
const appColors = [
    // ["#0096ff", "#043eff"], // blue
    ["#F7D06A", "#E98C33", "#C46927"], // gold
    ["#EC6F8E", "#C75480", "#AA2457"], // salmon
    ["#B8D1E3", "#7C8DB3", "#5B698C"], // silver
    ["#83D8F9", "#3F80F6", "#2951BE"], // blue
    ["#AE83CF", "#9065D1", "#68449E"], // violet
    ["#E392CC", "#E2689D", "#B33B6D"], // pink
    ["#ECB08C", "#EA7B4B", "#BC4F33"], // bronze
    ["#90DCA1", "#69C97D", "#4D9161"], // green
    ["#F3B576", "#B77D50", "#7C4C3C"], // brown
    ["#D57AC5", "#E439C9", "#A1328F"], // purple
    ["#98E0F9", "#53A5F5", "#3E79C0"], // lightblue
    ["#DC6AA6", "#C62A5A", "#AA2457"], // red
    ["#C9D3DF", "#8393A7", "#53657D"], // gray colors from the theme
];


const chartColors = [
    "#006aff",
    "#c00",
    "#00c05a",
    "#70b",
    "#e98c33",
    "#9065d1",
    "#ffed33",
    "#8393a7",
    "#0c95b7",
    "#70b"
];

export type ThemeColor =
    "black" |
    "white" |
    "lightGray" |
    "midGray" |
    "gray" |
    "darkGray" |
    "blue" |
    "lightBlue" |
    "lightBlue2" |
    "darkBlue" |
    "green" |
    "lightGreen" |
    "darkGreen" |
    "red" |
    "lightRed" |
    "darkRed" |
    "orange" |
    "darkOrange" |
    "purple" |
    "lightPurple" |
    "text" |
    "textHighlight" |
    "headerText" |
    "headerBg" |
    "headerIconColor" |
    "headerIconColor2" |
    "borderGray" |
    "paginationHoverColor" |
    "paginationDisabled" |
    "iconColor" |
    "iconColor2" |
    "FtIconColor" |
    "FtIconColor2" |
    "FtFolderColor" |
    "FtFolderColor2" |
    "spinnerColor" |
    "tableRowHighlight" |
    "wayfGreen" |
    "appCard" |
    "projectHighlight" |
    "yellow";


export type CSSVarThemeColor = `var(--${ThemeColor})`;

export function themeColor(color: ThemeColor): CSSVarThemeColor {
    return `var(--${color})` as CSSVarThemeColor;
}


// styled-system's `borderRadius` function can hook into the `radii` object/array
export const radii = [0, 2, 6];
export const radius = "5px";

export const borderWidth = "2px";

export const maxContainerWidth = "1280px";

// boxShadows: styled-systems hooks into shadows
// export const shadows = [
//   `0 0 2px 0 rgba(0,0,0,.08),0 1px 4px 0 rgba(0,0,0,.16)`,
//   `0 0 2px 0 rgba(0,0,0,.08),0 2px 8px 0 rgba(0,0,0,.16)`,
//   `0 0 2px 0 rgba(0,0,0,.08),0 4px 16px 0 rgba(0,0,0,.16)`,
//   `0 0 2px 0 rgba(0,0,0,.08),0 8px 32px 0 rgba(0,0,0,.16)`
// ]
// export const shadows = [
//   `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)`,
//   `0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)`,
//   `0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)`,
//   `0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)`,
//   `0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)`
// ]
// from Material design: 1dp to 24dp elevations
export const shadowsSmall = "0px  3px  3px -2px rgba(0,0,0,0.2), 0px  3px  4px 0px rgba(0,0,0,.14),0px 1px  8px 0px rgba(0,0,0,.12)";
const MDshadows = [
    `noshadow`,
    `0px  2px  1px -1px rgba(0,0,0,0.2), 0px  1px  1px 0px rgba(0,0,0,.14),0px 1px  3px 0px rgba(0,0,0,.12)`,
    `0px  3px  1px -2px rgba(0,0,0,0.2), 0px  2px  2px 0px rgba(0,0,0,.14),0px 1px  5px 0px rgba(0,0,0,.12)`,
    `0px  3px  3px -2px rgba(0,0,0,0.2), 0px  3px  4px 0px rgba(0,0,0,.14),0px 1px  8px 0px rgba(0,0,0,.12)`,
    `0px  2px  4px -1px rgba(0,0,0,0.2), 0px  4px  5px 0px rgba(0,0,0,.14),0px 1px 10px 0px rgba(0,0,0,.12)`,
    `0px  3px  5px -1px rgba(0,0,0,0.2), 0px  5px  8px 0px rgba(0,0,0,.14),0px 1px 14px 0px rgba(0,0,0,.12)`,
    `0px  3px  5px -1px rgba(0,0,0,0.2), 0px  6px 10px 0px rgba(0,0,0,.14),0px 1px 18px 0px rgba(0,0,0,.12)`,
    `0px  4px  5px -2px rgba(0,0,0,0.2), 0px  7px 10px 1px rgba(0,0,0,.14),0px 2px 16px 1px rgba(0,0,0,.12)`,
    `0px  5px  5px -3px rgba(0,0,0,0.2), 0px  8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12)`,
    `0px  5px  6px -3px rgba(0,0,0,0.2), 0px  9px 12px 1px rgba(0,0,0,.14),0px 3px 16px 2px rgba(0,0,0,.12)`,
    `0px  6px  6px -3px rgba(0,0,0,0.2), 0px 10px 14px 1px rgba(0,0,0,.14),0px 4px 18px 3px rgba(0,0,0,.12)`,
    `0px  6px  7px -4px rgba(0,0,0,0.2), 0px 11px 15px 1px rgba(0,0,0,.14),0px 4px 20px 3px rgba(0,0,0,.12)`,
    `0px  7px  8px -4px rgba(0,0,0,0.2), 0px 12px 17px 2px rgba(0,0,0,.14),0px 5px 22px 4px rgba(0,0,0,.12)`,
    `0px  7px  8px -4px rgba(0,0,0,0.2), 0px 13px 19px 2px rgba(0,0,0,.14),0px 5px 24px 4px rgba(0,0,0,.12)`,
    `0px  7px  9px -4px rgba(0,0,0,0.2), 0px 14px 21px 2px rgba(0,0,0,.14),0px 5px 26px 4px rgba(0,0,0,.12)`,
    `0px  8px  9px -5px rgba(0,0,0,0.2), 0px 15px 22px 2px rgba(0,0,0,.14),0px 6px 28px 5px rgba(0,0,0,.12)`,
    `0px  8px 10px -5px rgba(0,0,0,0.2), 0px 16px 24px 2px rgba(0,0,0,.14),0px 6px 30px 5px rgba(0,0,0,.12)`,
    `0px  8px 11px -5px rgba(0,0,0,0.2), 0px 17px 26px 2px rgba(0,0,0,.14),0px 6px 32px 5px rgba(0,0,0,.12)`,
    `0px  9px 11px -5px rgba(0,0,0,0.2), 0px 18px 28px 2px rgba(0,0,0,.14),0px 7px 34px 6px rgba(0,0,0,.12)`,
    `0px  9px 12px -6px rgba(0,0,0,0.2), 0px 19px 29px 2px rgba(0,0,0,.14),0px 7px 36px 6px rgba(0,0,0,.12)`,
    `0px 10px 13px -6px rgba(0,0,0,0.2), 0px 20px 31px 3px rgba(0,0,0,.14),0px 8px 38px 7px rgba(0,0,0,.12)`,
    `0px 10px 13px -6px rgba(0,0,0,0.2), 0px 21px 33px 3px rgba(0,0,0,.14),0px 8px 40px 7px rgba(0,0,0,.12)`,
    `0px 10px 14px -6px rgba(0,0,0,0.2), 0px 22px 35px 3px rgba(0,0,0,.14),0px 8px 42px 7px rgba(0,0,0,.12)`,
    `0px 11px 14px -7px rgba(0,0,0,0.2), 0px 23px 36px 3px rgba(0,0,0,.14),0px 9px 44px 8px rgba(0,0,0,.12)`,
    `0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,.14),0px 9px 46px 8px rgba(0,0,0,.12)`
];
export const shadows = [
    MDshadows[3],
    MDshadows[6],
    MDshadows[12],
    MDshadows[18],
    MDshadows[24]
];
const BoxShadowsAliases = ["sm", "md", "lg", "xl", "xxl"];
addAliases(shadows, BoxShadowsAliases);

// animation duration
export const duration = {
    fastest: "100ms",
    fast: "150ms",
    normal: "300ms",
    slow: "450ms",
    slowest: "600ms"
};

// animation easing curves
const easeInOut = "cubic-bezier(0.5, 0, 0.25, 1)";
const easeOut = "cubic-bezier(0, 0, 0.25, 1)";
const easeIn = "cubic-bezier(0.5, 0, 1, 1)";
const easeInQuint = "cubic-bezier(0.755, 0.05, 0.855, 0.06)"; // This is a steep easeIn curve
// This is a steep easeIn curve
const easeInQuintR = `cubic-bezier(${1 - 0.855}, ${1 - 0.06}, ${1 - 0.755}, ${1 - 0.05})`;
const easeOutQuint = "cubic-bezier(0.23, 1, 0.32, 1)";
const stepStart = "step-start";
const stepEnd = "step-end";

const timingFunctions = {
    easeInOut,
    easeOut,
    easeIn,
    easeInQuint,
    easeInQuintR,
    easeOutQuint,
    stepStart,
    stepEnd,
};

// animation delay
const transitionDelays = {
    xsmall: `40ms`,
    small: `60ms`,
    medium: `160ms`,
    large: `260ms`,
    xLarge: `360ms`
};

const theme = {
    breakpoints,
    mediaQueryGT,
    mediaQueryLT,
    space,
    fontFamily,
    fontSizes,
    fontWeights,
    lineHeights,
    letterSpacings,
    regular,
    chartColors,
    bold,
    appColors,
    radii,
    radius,
    shadows: shadows as string[] & {sm: string; md: string; lg: string; xl: string; xxl: string;},
    maxContainerWidth,
    duration,
    timingFunctions,
    transitionDelays,
    borderWidth,
};

export function selectHoverColor(inputColor: string | ThemeColor): string | ThemeColor {
    switch (inputColor) {
        case "red":
            return "darkRed";
        default:
            return inputColor;
    }
}

export type Theme = typeof theme;

export default theme;
