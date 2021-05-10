import {AppToolLogo} from "Applications/AppToolLogo";
import * as React from "react";
import styled, {css} from "styled-components";
import {Absolute, Flex, Icon, RatingBadge, Text} from "ui-components";
import Box from "ui-components/Box";
import * as Heading from "ui-components/Heading";
import Link from "ui-components/Link";
import Markdown from "ui-components/Markdown";
import {EllipsedText} from "ui-components/Text";
import theme from "ui-components/theme";
import * as Pages from "./Pages";
import {compute} from "UCloud";
import ApplicationWithFavoriteAndTags = compute.ApplicationWithFavoriteAndTags;

interface ApplicationCardProps {
    onFavorite?: (name: string, version: string) => void;
    app: Pick<ApplicationWithFavoriteAndTags, "tags" | "metadata">;
    isFavorite?: boolean;
    linkToRun?: boolean;
    colorBySpecificTag?: string;
    tags: string[];
}

const AppCardBase = styled(Link)`
    padding: 10px;
    width: 100%;
    display: flex;
    align-items: center;

    & > img {
        width: 32px;
        height: 32px;
        margin-right: 16px;
        border-radius: 5px;
        flex-shrink: 0;
    }

    & > strong {
        margin-right: 16px;
        font-weight: bold;
        flex-shrink: 0;
    }

    & > ${EllipsedText} {
        color: var(--gray, #f00);
        flex-grow: 1;
    }

    & > ${EllipsedText} > p {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

export const ApplicationCardContainer = styled.div`
    display: flex;
    flex-direction: column;

    & > ${AppCardBase}:first-child {
        border: 1px solid var(--borderGray, #f00);
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
    }

    & > ${AppCardBase} {
        border: 1px solid var(--borderGray, #f00);
        border-top: 0;
    }

    & > ${AppCardBase}:last-child {
        border-bottom-left-radius: 5px;
        border-bottom-right-radius: 5px;
    }
`;

export const SlimApplicationCard: React.FunctionComponent<ApplicationCardProps> = (props) => {
    const {metadata} = props.app;
    return (
        <AppCardBase to={props.linkToRun ? Pages.runApplication(metadata) : Pages.viewApplication(metadata)}>
            <Box mr={16}>
                <AppToolLogo name={metadata.name} type={"APPLICATION"} size={"32px"} />
            </Box>
            <strong>{metadata.title} v{metadata.version}</strong>
            <EllipsedText>
                <Markdown
                    source={metadata.description}
                    disallowedTypes={[
                        "break",
                        "paragraph",
                        "emphasis",
                        "strong",
                        "thematicBreak",
                        "blockquote",
                        "delete",
                        "link",
                        "image",
                        "linkReference",
                        "imageReference",
                        "table",
                        "tableRow",
                        "tableCell",
                        "list",
                        "listItem",
                        "definition",
                        "heading",
                        "inlineCode",
                        "code",
                        "html"]}
                    unwrapDisallowed
                />
            </EllipsedText>
            <Flex><Icon name="chevronDown" size={"18px"} rotation={-90} /></Flex>
        </AppCardBase>
    );
};

export const AppCard = styled(Link)`
    padding: 10px 20px 10px 10px;
    width: 100%;
    min-width: 400px;
    height: 128px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    border-radius: ${theme.radius};
    position: relative;
    overflow: hidden;
    box-shadow: ${theme.shadows.sm};
    background-color: var(--appCard, #f00);

    transition: transform ${theme.timingFunctions.easeIn} ${theme.duration.fastest} ${theme.transitionDelays.xsmall};
    will-change: transform;

    &:hover {
        transition: transform ${theme.timingFunctions.easeOut} ${theme.duration.fastest} ${theme.transitionDelays.xsmall};
        // box-shadow: ${theme.shadows.md};
        box-shadow: 0px  3px  5px -1px rgba(0,106,255,0.2), 0px  6px 10px 0px rgba(0,106,255,.14),0px 1px 18px 0px rgba(0,106,255,.12);
        transform: translateY(-2px);
    }

    // Background
    &:before {
        pointer-events: none;
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        z-index: -1;
        background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIHZpZXdCb3g9IjAgMCBhdXRvIGF1dG8iIHg9IjAiIHk9IjAiIGlkPSJwMSIgd2lkdGg9IjU2IiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoMTUpIHNjYWxlKDAuNSAwLjUpIiBoZWlnaHQ9IjEwMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTI4IDY2TDAgNTBMMCAxNkwyOCAwTDU2IDE2TDU2IDUwTDI4IDY2TDI4IDEwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlkM2RmNDQiIHN0cm9rZS13aWR0aD0iMS41Ij48L3BhdGg+PHBhdGggZD0iTTI4IDBMMjggMzRMMCA1MEwwIDg0TDI4IDEwMEw1NiA4NEw1NiA1MEwyOCAzNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlkM2RmNDQiIHN0cm9rZS13aWR0aD0iNCI+PC9wYXRoPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNwMSkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjwvcmVjdD48L3N2Zz4=");
    }

    &:after {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        z-index: 1;
        border: 2px solid var(--textHighlight, #f00);
        opacity: 0;
        border-radius: ${theme.radius};
        pointer-events: none; //needed for star-badge
        will-change: opacity;
    }

    &:hover:after {
        opacity: 1;
    }
`;

export const Tag = ({label, bg = "darkGray"}: {label: string; bg?: string}): JSX.Element => (
    <RatingBadge mr="3px" bg={bg}><Heading.h6>{label}</Heading.h6></RatingBadge>
);

const appColors = theme.appColors;

const nColors = appColors.length;

const bgGradients = appColors.map(x => (`linear-gradient(0deg, ${x[0]}, ${x[2]})`));

interface AppLogoRawProps {
    color1Offset: number;
    color2Offset: number;
    appC: number;
    rot: number;
    size: string;
}

export const AppLogoRaw = ({rot, color1Offset, color2Offset, appC, size}: AppLogoRawProps): JSX.Element => {
    const c1 = [color1Offset % 3, (color1Offset + 1) % 3, (color1Offset + 2) % 3];
    const c2 = [color2Offset % 3, (color2Offset + 1) % 3, (color2Offset + 2) % 3];
    const centerC = nColors - 1;
    // const centerC = appC;

    const s32 = Math.sqrt(3) * .5;
    const r1 = 0.5; // inner radius of outer element (outer radius is 1)
    const r2 = 0.7; // outer radius of inner element
    const r3 = (1 + r2) * .5; // radius of white background hexagon

    const rot120 = "rotate(120 0 0)";
    const rot240 = "rotate(240 0 0)";

    return (
        <svg
            width={size}
            height={size}
            viewBox={`-1 -${s32} 2 ${2 * s32}`}
            fillRule="evenodd"
            clipRule="evenodd"
        >
            <defs>
                <path id="hex_to___" d={`M-${r1} 0H-1L-0.5 ${s32}H0.5L${(0.5 * r1)} ${s32 * r1}H-${0.5 * r1}Z`} />
                <path id="hex_ti___" d={`M0 0H${r2}L${0.5 * r2} -${s32 * r2}H-${0.5 * r2}Z`} fillOpacity=".55" />
                <path
                    id="hex_th___"
                    d={`M-${r3} 0L-${0.5 * r3} ${s32 * r3}H${0.5 * r3}L${r3} 0L${0.5 * r3} -${s32 * r3}H-${0.5 * r3}Z`}
                />
            </defs>
            <g transform={`rotate(${rot} 0 0)`}>
                <use xlinkHref="#hex_th___" fill="#fff" />
                <use xlinkHref="#hex_to___" fill={appColors[appC][c1[0]]} />
                <use xlinkHref="#hex_to___" fill={appColors[appC][c1[1]]} transform={rot120} />
                <use xlinkHref="#hex_to___" fill={appColors[appC][c1[2]]} transform={rot240} />
                <use xlinkHref="#hex_ti___" fill={appColors[centerC][c2[0]]} />
                <use xlinkHref="#hex_ti___" fill={appColors[centerC][c2[1]]} transform={rot120} />
                <use xlinkHref="#hex_ti___" fill={appColors[centerC][c2[2]]} transform={rot240} />
            </g>
        </svg>
    );
};

export const AppLogo = ({size, hash}: {size: string, hash: number}): JSX.Element => {
    const i1 = (hash >>> 30) & 3;
    const i2 = (hash >>> 20) & 3;
    const rot = [0, 15, 30];
    const i3 = (hash >>> 10) % rot.length;
    const appC = appColor(hash);

    return <AppLogoRaw rot={rot[i3]} color1Offset={i1} color2Offset={i2} appC={appC} size={size} />;
};


const AppRibbonContainer = styled(Absolute) <{favorite?: boolean}>`
    ${({favorite}) => favorite ? null : 
        css`
            transition: opacity ease 0.1s;
            opacity: 0;

            ${AppCard}: hover &{
                opacity: 1;
            }
        `
    };
`;


export function hashF(str: string): number {
    let hash = 5381;
    let i = str.length;

    while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }

    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
     * integers. Since we want the results to be always positive, convert the
     * signed int to an unsigned by doing an unsigned bitshift. */

    return hash >>> 0;

}

export function appColor(hash: number): number {
    return (hash >>> 22) % (nColors - 1); // last color not used
}

const AbsoluteNoPointerEvents = styled(Absolute)`
    pointer-events: none;
`;

export const ApplicationCard: React.FunctionComponent<ApplicationCardProps> = ({
    app,
    onFavorite,
    isFavorite,
    colorBySpecificTag,
    linkToRun
}: ApplicationCardProps) => {
    const hash = hashF(colorBySpecificTag ?? app.metadata.title ?? "fallback");
    const {metadata} = app;
    const appC = appColor(hash);
    return (
        <AppCard to={linkToRun ? Pages.runApplication(metadata) : Pages.viewApplication(metadata)}>
            <AbsoluteNoPointerEvents right={0} top={0}
                cursor="inherit"
                height="100%"
                width="10px"
                background={bgGradients[appC]} />
            {(!onFavorite && !isFavorite) ? null : (
                <AppRibbonContainer
                    cursor="inherit"
                    right={"20px"}
                    top={"8px"}
                    favorite={isFavorite}
                    onClick={onFavoriteClick}
                >
                    <Icon name={isFavorite ? "starFilled" : "starEmpty"} color="red" size={32} />
                </AppRibbonContainer>
            )}
            <Flex flexDirection="row" alignItems="flex-start" zIndex={1}>
                <AppToolLogo name={app.metadata.name} type="APPLICATION" size="60px" />
                <Flex flexDirection="column" ml="10px">
                    <EllipsedText fontSize="20px" maxWidth="220px">{metadata.title}</EllipsedText>
                    <Text>v{metadata.version}</Text>

                </Flex>
            </Flex>
            <EllipsedText title={`by ${metadata.authors.join(", ")} `} color="gray" width={1} mt={"4px"}>
                        by {app.metadata.authors.join(", ")}
            </EllipsedText>
            <Box mt="auto" />
            <Flex flexDirection="row" alignItems="flex-start" zIndex={1}>
                {buildTags(app.tags).map((tag, idx) => <Tag label={tag} key={idx} />)}
            </Flex>
        </AppCard>
    );

    function onFavoriteClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        e.preventDefault();
        onFavorite?.(metadata.name, metadata.version);
    }
};

export const CardToolContainer = styled.div`
    display: grid;
    flex-direction: column;
    align-items: flex-start;
    border-radius: 5px;
    overflow: hidden;
    width: 100%;
`;

export const SmallCard = styled(Link) <{color1: string; color2: string; color3: string}>`
    display: flex;
    padding: 10px;
    width: 150px;
    height: 50px;
    border-radius: 10px;
    font-size: ${theme.fontSizes[2]}px;
    text-align: center;
    align-items: center;
    justify-content: center;
    background-color: ${p => p.color2};
    box-shadow: ${theme.shadows.sm};

    transition: transform ${theme.timingFunctions.easeIn} ${theme.duration.fastest} ${theme.transitionDelays.xsmall};

    &:hover {
        transition: transform ${theme.timingFunctions.easeOut} ${theme.duration.fastest} ${theme.transitionDelays.xsmall};
        transform: translateY(-2px);
        color: var(--white, #f00);
    }
`;

// TODO: Limit is too arbitrary currently. Find better solution.
function buildTags(tags: string[]): string[] {
    let limit = 40;
    if (tags.join().length < limit && tags.length < 4) return tags;
    const result: string[] = [];
    tags.forEach(t => {
        if (t.length > limit) return;
        result.push(t);
        limit -= t.length + 2.4;
    });
    if (result.length < tags.length) {
        result.pop();
        result.push(`+${tags.length - result.length} more`);
    }
    return result;
}
