import {ThemeColor} from "ui-components/theme";

export function getCssVar(name: ThemeColor): string {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);
}
