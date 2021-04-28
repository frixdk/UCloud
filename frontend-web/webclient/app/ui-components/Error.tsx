import * as React from "react";
import Box from "ui-components/Box";
import Card from "ui-components/Card";
import Flex from "ui-components/Flex";
import Icon from "ui-components/Icon";
import Text from "ui-components/Text";
import {styled} from "@linaria/react";
import {ThemeColor, themeColor} from "ui-components/theme";

interface ErrorProps {clearError?: () => void; error?: string; width?: string | number}
function Error(props: ErrorProps): JSX.Element | null {
    if (!props.error) return null;

    function onClearError(e: React.MouseEvent<HTMLElement, MouseEvent>): void {
        props.clearError!();
        e.stopPropagation();
    }

    return (
        <ErrorWrapper
            bg="lightRed"
            borderColor="red"
        >
            <Flex alignItems="center">
                <div><WhiteSpacedText fontSize={1} color="red">{props.error}</WhiteSpacedText></div>
                {!props.clearError ? null : (
                    <Box ml="auto">
                        <Icon
                            size="1em"
                            name="close"
                            color="black"
                            onClick={onClearError}
                        />
                    </Box>
                )}
            </Flex>
        </ErrorWrapper>
    );
}

interface ErrorWrapperProps {
    width?: string | number;
    bg: ThemeColor;
    borderColor: ThemeColor;
}

export const ErrorWrapper: React.FunctionComponent<React.PropsWithChildren<ErrorWrapperProps>> = props => (
    <Card
        borderRadius="6px"
        height="auto"
        p="1em 1em 1em 1em"
        color="black"
        background={themeColor(props.bg)}
        borderColor={themeColor(props.borderColor)}
        width={props.width}
    >
        {props.children}
    </Card>
);

const WhiteSpacedText = styled(Text)`
    white-space: pre;
`;

export default Error;
