import {styled} from "@linaria/react";

export const TermAndShellWrapper = styled.div<{addPadding: boolean}>`
  display: flex;
  height: 100vh;
  width: 100vw;
  flex-direction: column;
  padding: ${p => p.addPadding ? "16px" : "0"};

  &.light {
    background: #ffffff;
  }

  &.dark {
    background: #282a36;
  }

  .contents {
    width: 100%;
    height: 100%;
  }

  .warn {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 1000000;
    width: 100vw;
    display: flex;
    padding: 16px;
    align-items: center;
    background: black;
    color: white;
  }
`;
