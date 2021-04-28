import * as React from "react";
import Icon, {IconName} from "./Icon";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";
import {StyledSystemProperties} from "styled-system";

const RadioTilesContainer: React.FunctionComponent<StyledSystemProperties> = withStyledSystemCompatibility([], styled.div`
  align-items: center;
  display: inline-grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(auto);
  column-gap: 5px;
`);

const RadioTile = (props: RadioTileProps): JSX.Element => {
    const {height, label, icon, checked, disabled, onChange, name} = props;

    return (
        <RadioTileWrap height={height} checked={checked} disabled={disabled}>
            <RadioTileInput type="radio" name={name}
                id={label} value={label}
                checked={checked} disabled={disabled}
                onChange={onChange} />
            <RadioTileIcon>
                <Icon name={icon} size={props.labeled ? "65%" : "85%"} />
                <RadioTileLabel htmlFor={label}>
                    {props.labeled ? label : undefined}
                </RadioTileLabel>
            </RadioTileIcon>
        </RadioTileWrap>
    );
};

interface RadioTileProps extends RadioTileWrapProps {
    label: string;
    icon: IconName;
    name: string;
    labeled?: boolean;
    onChange: (value: React.ChangeEvent<HTMLInputElement>) => void;
}

interface RadioTileWrapProps {
    height: number;
    checked: boolean;
    disabled?: boolean;
}


RadioTile.defaultProps = {
    labeled: true
};

const RadioTileIcon = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 5px;
    border: 1px solid var(--invertedThemeColor);
    color: var(--invertedThemeColor, #f00);
    transition: all 300ms ease;
`;

const RadioTileWrap = styled.div<RadioTileWrapProps>`
  position: relative;
  height:  ${props => props.height}px;
  width:  ${props => props.height}px;
  transition: transform 300ms ease;

  &:hover {
    transform: translateY(-2px);
  }

  &:hover > ${RadioTileIcon} {
    color: var(--blue);
    border: 1px solid var(--blue);
  }
  &:hover > ${RadioTileIcon}:disabled, &:hover > ${RadioTileIcon}:checked {
    color: inherit;
    border: inherit;
    transform: inherit;
  }
`;

const RadioTileInput = styled.input`
  opacity: 0;
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  margin: 0;
  cursor: pointer;

  &:checked + ${RadioTileIcon} {
    background-color: var(--blue, #f00);
    border: 0px solid white;
    color: white;
  }
`;

const RadioTileLabel = styled.label`
  text-align: center;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  line-height: 1;
  padding-top: 0.1rem;
  font-size: 0.8em;
`;

export {RadioTilesContainer, RadioTile};
