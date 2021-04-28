import Box from "./Box";
import * as React from "react";
import Flex from "./Flex";
import Truncate from "./Truncate";
import {stopPropagationAndPreventDefault} from "UtilityFunctions";
import {IconName} from "ui-components/Icon";
import {Icon, Text} from "ui-components/index";
import theme, {ThemeColor} from "./theme";
import {Cursor} from "ui-components/Types";
import {styled} from "@linaria/react";

const List = styled(Box) <{fontSize?: string; childPadding?: string; bordered?: boolean}>`
  font-size: ${p => p.fontSize!}px;
    & > * {
      border-bottom: ${p => p.bordered ? "1px solid var(--lightGray)" : "0"};
      margin-bottom: ${p => p.childPadding ?? "0"};
      margin-top: ${p => p.childPadding ?? "0"};
    }

    & > *:last-child {
      border-bottom: 0;
    }
`;

List.defaultProps = {
    fontSize: theme.fontSizes[3],
    bordered: true
};

List.displayName = "List";

interface ListRowProps {
    isSelected?: boolean;
    select?: () => void;
    navigate?: () => void;
    truncateWidth?: string;
    left: React.ReactNode;
    leftSub?: React.ReactNode;
    icon?: React.ReactNode;
    bg?: string;
    right: React.ReactNode;
    fontSize?: string | number;
}

export function ListRow(props: ListRowProps): JSX.Element {
    const isSelected = props.isSelected ?? false;
    const truncateWidth = props.truncateWidth ?? "180px";
    const left = props.leftSub ? (
        <Box maxWidth={`calc(100% - ${truncateWidth})`} width="auto">
            <Truncate
                cursor={props.navigate ? "pointer" : "default"}
                onClick={e => {
                    (props.navigate ?? props.select)?.();
                    e.stopPropagation();
                }}
                mb="-4px"
                width={"100%"}
                fontSize={props.fontSize ?? 20}
            >{props.left}</Truncate>
            <Flex mt="4px">
                {props.leftSub}
            </Flex>
        </Box>
    ) : props.left;
    return (
        <HoverColorFlex
            background={props.bg}
            isSelected={isSelected}
            onClick={props.select}
            pt="5px"
            pb="5px"
            width="100%"
            alignItems="center"
        >
            {props.icon ?
                <Box onClick={stopPropagationAndPreventDefault} mx="8px">{props.icon}</Box> :
                <Box width="4px" />
            }
            {left}
            <Box ml="auto" />
            <Flex mr="8px">
                {props.right}
            </Flex>
        </HoverColorFlex>
    );
}

export const ListStatContainer = styled(Flex)`
    & > * {
      margin-right: 16px;
    }
`;

export const ListRowStat: React.FunctionComponent<{
    icon?: IconName;
    color?: ThemeColor;
    color2?: ThemeColor;
    textColor?: ThemeColor;
    onClick?: () => void;
    cursor?: Cursor;
}> = props => {
    const color: ThemeColor = props.color ?? "gray";
    const color2: ThemeColor = props.color2 ?? "white";
    return (
        <>
            <Text color={props.textColor ?? "gray"} fontSize={0} mr={"4px"} cursor={props.cursor}
                  onClick={props.onClick}>
                {!props.icon ? null : (<>
                    <Icon size={"10"} color={color} color2={color2} name={props.icon} mt={"-2px"} />
                    {" "}
                </>)}
                {props.children}
            </Text>
        </>
    );
};

const HoverColorFlex = styled(Flex) <{isSelected: boolean}>`
    transition: background-color 0.3s;
    ${p => p.isSelected ? "background-color: var(--lightBlue);" : ""}
    &:hover {
        background-color: var(--lightBlue, #f00);
    }
`;

export default List;
