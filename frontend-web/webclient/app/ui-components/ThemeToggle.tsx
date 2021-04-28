import * as React from "react";
import Relative from "./Relative";
import {styled} from "@linaria/react";

/*!

    The MIT License (MIT)

    Copyright (c) <2019> <Erin Freeman> <https://codepen.io/efreeman79/pen/XgZPGO>

    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
    documentation files (the "Software"), to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
    to permit persons to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of
    the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
    THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.

 */

interface ThemeToggleProps {
    size: number;
    active: boolean;
}

export function ThemeToggler(
    {
        isLightTheme,
        onClick
    }: { isLightTheme: boolean; onClick: (e: React.SyntheticEvent<HTMLDivElement>) => void }
): JSX.Element {

    function toggleActive(): void {
        setActive(!active);
    }

    const [active, setActive] = React.useState<boolean>(isLightTheme);
    return (
        <Relative onClick={onClick} ml="auto" mr="auto">
            <Wrapper onClick={toggleActive} size={1} active={active}>
                <Switch size={1} active={active}>
                    <Moon>
                        <Crater active={active}/>
                        <Crater active={active}/>
                        <Crater active={active}/>
                    </Moon>
                </Switch>
                <Clouds active={active}>
                    <Cloud/>
                    <Cloud/>
                    <Cloud/>
                </Clouds>
                <Stars active={active}>
                    <Star active={active}/>
                    <Star active={active}/>
                    <Star active={active}/>
                    <Star active={active}/>
                    <Star active={active}/>
                    <Star active={active}/>
                </Stars>
            </Wrapper>
        </Relative>
    );
}

const Moon = styled.div`

`;


const Wrapper = styled.div<ThemeToggleProps>`
  height: calc(${p => p.size} * 1.2em);
  width: ${p => p.size * 2.8}em;
  background: ${p => p.active ? "#3f97ff" : "#3c4145"};
  overflow: hidden;
  border-radius: ${p => p.size * 0.4}em;
  transition: all 0.35s ease;

  &:hover {
    cursor: pointer;
  }
`;

const Switch = styled.div<ThemeToggleProps>`
  --size: ${p => p.size}em;
  position: absolute;
  z-index: 2;
  transition: all 0.35s ease;
  margin: calc(var(--size) * 0.1em);
  height: var(--size);
  width: var(--size);
  border: calc(var(--size) * 0.15em) solid #333;
  border-radius: 50%;
  background: ${p => p.active ? "#ffdf6d" : "#ffffff"};
  box-sizing: border-box;
  border-color: ${p => p.active ? "#e1c448" : "#e3e7c7"};
  left: ${p => p.active ? "calc(var(--size) * 1.5)" : "calc(var(--size) * 0.1em)"};
`;

const Crater = styled.div<{ active?: boolean }>`
  position: absolute;
  border-radius: 50%;
  height: 25%;
  width: 25%;
  background: transparent;
  box-shadow: inset 0 0 0 4px #e3e7c7;

  &:nth-child(1) {
    top: 12%;
    left: 22%;
  }

  &:nth-child(2) {
    top: 49%;
    left: 10%;
    transform: scale(0.7);
  }

  &:nth-child(3) {
    top: 50%;
    left: 60%;
  }

  display: ${p => p.active ? "none" : "block"};
`;

const StarsAndsCloudsBase = styled.div`
  position: absolute;
  height: 100%;
  width: 66%;
  z-index: 1;
  transition: all 0.35s ease;
`;

const Cloud = styled.div`
  position: absolute;
  background: #fff;
  border-radius: 999px;

  &:nth-child(1) {
    top: 45%;
    left: 25%;
    width: 50%;
    height: 30%;
    border-radius: 999px;
  }

  &:nth-child(2) {
    top: 30%;
    left: 52%;
    width: 15%;
    padding-bottom: 15%;
    height: 0;
  }

  &:nth-child(3) {
    top: 24%;
    left: 32%;
    width: 25%;
    padding-bottom: 25%;
    height: 0;
  }
`;

const Clouds = styled(StarsAndsCloudsBase) <{ active: boolean }>`
  left: -5%;
  opacity: ${props => props.active ? 1 : 0};
`;

const Star = styled.div<{ active?: boolean }>`
  position: absolute;
  height: 3px;
  width: 3px;
  border-radius: 50%;
  background: #fff;

  transform: ${p => p.active ? "scale(0) !important" : "none"};
  transition: ${p => p.active ? "all 0.7s ease" : "none"};

  &:nth-child(1) {
    top: 26%;
    left: 64%;
    transform: scale(0.6);
    transition-delay: 0.2s;
  }

  &:nth-child(2) {
    top: 20%;
    left: 34%;
    transform: scale(0.7);
    transition-delay: 0.4s;
  }

  &:nth-child(3) {
    top: 38%;
    left: 18%;
    transform: scale(0.4);
    transition-delay: 0.65s;
  }

  &:nth-child(4) {
    top: 67%;
    left: 30%;
    transform: scale(0.55);
    transition-delay: 0.85s;
  }

  &:nth-child(5) {
    top: 49%;
    left: 48%;
    transform: scale(0.7);
    transition-delay: 1s;
  }

  &:nth-child(6) {
    top: 68%;
    left: 72%;
    transform: scale(0.7);
    transition-delay: 1.05s;
  }
`;

const Stars = styled(StarsAndsCloudsBase) <{ active: boolean }>`
  right: 0;
  opacity: ${props => props.active ? 0 : 1};
`;
