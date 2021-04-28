import * as React from "react";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

interface HexSpinProps {
    size?: number;
}

const hexColors = ["#0057B8", "#82A", "#266D7F", "#F8A527", "#F11E4A"];
const nColors = hexColors.length;
const delay = 0.04;
const pathN = 18;

// NOTE(Dan): This dynamic CSS creation is no longer supported in our "styled" layer. As a result, we are instead
//   generating it manually at run-time and injecting it (just like styled-components did for us).
let didInjectStyles = false;
function createKF() {
    let kf = ``;
    kf += "@keyframes UCloudLoadingIcon {\n";
    for (let i = 0; i < nColors; i += 1) {
        kf += `${i * 100 / nColors}% { fill: ${hexColors[i]}; }`;
    }
    kf += `100% { fill: ${hexColors[0]}; }`;
    kf += "}\n";
    return kf;
}

function createCSS() {
    if (didInjectStyles) return;
    didInjectStyles = true;
    let style = ``;
    for (let i = 1; i <= pathN; i += 1) {
        style += `
            .ucloud-loading-icon path:nth-child(${i}) {
                animation: UCloudLoadingIcon ${delay * pathN}s linear infinite;
                animation-delay: -${i * delay}s;
            }
        `;
    }

    style += "\n";
    style += createKF();

    const styleTag = document.createElement("style");
    styleTag.innerHTML = style;
    document.head.appendChild(styleTag);
}

export const HexSpinWrapper = withStyledSystemCompatibility([], styled.div`
  margin: 20px auto;
  animation-name: UCloudLoadingIcon;
`);

const HexSpin: React.FunctionComponent<HexSpinProps> = ({size = 32}) => {
    createCSS();
    return (
        <HexSpinWrapper data-tag="loading-spinner" width={size} height={size}>
            <svg
                className={"ucloud-loading-icon"}
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                version="1.1"
                id="svg"
                width={size}
                height={size}
                viewBox="0 0 220 220"
            >
                <path d="M80.296,0.12l14.673,54.761l40.088,-40.088l-54.761,-14.673Z"/>
                <path d="M149.73,69.554l-14.673,-54.761l-40.088,40.088l54.761,14.673Z"/>
                <path d="M189.818,29.466l-54.761,-14.673l14.673,54.761l40.088,-40.088Z"/>
                <path d="M204.491,84.228l-14.673,-54.762l-40.088,40.088l54.761,14.674Z"/>
                <path d="M164.403,124.316l40.088,-40.088l-54.761,-14.674l14.673,54.762Z"/>
                <path d="M219.165,138.989l-14.674,-54.761l-40.088,40.088l54.762,14.673Z"/>
                <path d="M179.077,179.077l-14.674,-54.761l54.762,14.673l-40.088,40.088Z"/>
                <path d="M124.316,164.403l54.761,14.674l-14.674,-54.761l-40.087,40.087Z"/>
                <path d="M138.989,219.165l40.088,-40.088l-54.761,-14.674l14.673,54.762Z"/>
                <path d="M84.228,204.491l54.761,14.674l-14.673,-54.762l-40.088,40.088Z"/>
                <path d="M69.554,149.73l14.674,54.761l40.088,-40.088l-54.762,-14.673Z"/>
                <path d="M29.466,189.818l54.762,14.673l-14.674,-54.761l-40.088,40.088Z"/>
                <path d="M14.793,135.057l14.673,54.761l40.088,-40.088l-54.761,-14.673Z"/>
                <path d="M54.881,94.969l-40.088,40.088l54.761,14.673l-14.673,-54.761Z"/>
                <path d="M0.12,80.296l14.673,54.761l40.088,-40.088l-54.761,-14.673Z"/>
                <path d="M40.208,40.208l-40.088,40.088l54.761,14.673l-14.673,-54.761Z"/>
                <path d="M94.969,54.881l-54.761,-14.673l14.673,54.761l40.088,-40.088Z"/>
                <path d="M80.296,0.12l-40.088,40.088l54.761,14.673l-14.673,-54.761Z"/>
            </svg>
        </HexSpinWrapper>
    );
};

export function PredicatedLoadingSpinner({loading, size}: { loading: boolean, size?: number }): JSX.Element | null {
    if (loading) return <HexSpin size={size}/>
    return null;
}

export default HexSpin;
