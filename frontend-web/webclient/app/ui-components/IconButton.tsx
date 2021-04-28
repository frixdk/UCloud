import * as React from "react";
import Button, {ButtonProps, ButtonStyle} from "./Button";
import Icon, {IconName} from "./Icon";
import {styled} from "@linaria/react";

export interface IconButtonProps {
    name: IconName;
    size?: number | string;
    color?: string;
    onClick?: (e?: React.SyntheticEvent<HTMLButtonElement>) => void;
}

const TransparentButton = styled.button`
  padding: 0;
  height: auto;
  background-color: transparent;
  color: inherit;

  &:hover {
    background-color: transparent;
  }
`;

const IconButton = ({name, size, ...props}: IconButtonProps): JSX.Element => (
    <TransparentButton {...props} className={ButtonStyle}>
        <Icon name={name} size={size} />
    </TransparentButton>
);

IconButton.displayName = "IconButton";

export default IconButton;
