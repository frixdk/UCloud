import {styled} from "@linaria/react";
import theme from "ui-components/theme";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

export const TextArea = withStyledSystemCompatibility(["error"], styled.textarea <{ error?: boolean }>`
  border-radius: 5px;
  border: ${theme.borderWidth} solid ${p => p.error ? "var(--red)" : "var(--borderGray, #f00)"};
  background-color: transparent;
  color: var(--black, #f00);
  padding: 5px;
  resize: none;
  vertical-align: top;

  &:focus {
    outline: none;
  }

  &:disabled {
    background-color: var(--lightGray, #f00);
  }
`);

TextArea.displayName = "TextArea";

export default TextArea;
