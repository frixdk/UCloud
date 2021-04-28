import {styled} from "@linaria/react";

// https://www.w3schools.com/howto/howto_js_snackbar.asp

export const /* Admiral */ Snackbar = styled.div<{visible: boolean}>`
    min-width: 250px;
    width: auto;
    background-color: var(--black, #f00);
    color: var(--white, #f00);
    text-align: center;
    border-radius: 2px;
    padding: 16px;
    position: fixed;
    z-index: 200;
    left: 50%;
    transform: translate(-50%);
    bottom: 30px;
    user-select: none;

    visibility: ${p => p.visible ? "visible" : "hidden"};
`;

Snackbar.displayName = "Snackbar";
