import * as React from "react";
import {css} from "@linaria/core";

const ToolTipStyle = css`
  &[data-tooltip] {
    position: relative;

    &::before, &::after {
      position: absolute;
      display: none;

      pointer-events: none;
      user-select: none;

      line-height: 1;
      font-size: .9em;
    }

    &::after {
      content: attr(data-tooltip);
      text-align: center;
      white-space: nowrap;
      padding: 5px;
      background: var(--black);
      color: var(--white);
      z-index: 1000;
    }

    &:hover::after {
      display: block;
    }
  }

  &:not([data-direction]),
  &[data-direction="up"] {
    &::after {
      bottom: 100%;
      left: 50%;
      transform: translate(-50%, .5em);
    }
  }

  &[data-direction="down"] {
    &::after {
      top: 100%;
      left: 50%;
      transform: translate(-50%, .5em);
    }
  }
  
  &[data-direction="left"] {
    &::after {
      right: 50%;
      left: auto;
      top: 50%;
      transform: translate(.5em, -50%);
    }
  }
  
  &[data-direction="right"] {
    &::after {
      left: 100%;
      top: 50%;
      transform: translate(.5em, -50%);
    }
  }
`;

const Tooltip: React.FunctionComponent<{direction?: "up" | "down" | "left" | "right", tooltip: string}> = props => {
    return <div className={ToolTipStyle} data-tooltip={props.tooltip} data-direction={props.direction}>
        {props.children}
    </div>;
};

export default Tooltip;
