import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

export const Table = withStyledSystemCompatibility([], styled.table`
  border: 0;
  border-spacing: 0;
  table-layout: fixed;
`);

Table.displayName = "Table";

Table.defaultProps = {
    background: "var(--white)",
    width: "100%",
    minWidth: "15em"
};

export const TableCell = withStyledSystemCompatibility([], styled.td`
  border: 0;
  border-spacing: 0;
`);

TableCell.displayName = "TableCell";

const isHighlighted = ({highlighted}: { highlighted?: boolean }): any =>
    highlighted ? {backgroundColor: "--var(tableRowHighlight)"} : null;

export const TableRow = withStyledSystemCompatibility(
    [],
    styled.tr<{ highlighted?: boolean; contentAlign?: string; }>`
      background-color: ${p => p.highlighted ? "var(--tableRowHighlight)" : "transparent"};

      & > td {
        border-spacing: 0;
        border-top: 1px solid rgba(34, 36, 38, .1);
        padding-top: 8px;
        padding-bottom: 8px;
      }
    `
);

TableRow.defaultProps = {
    background: "var(--white)",
    cursor: "auto"
};

TableRow.displayName = "TableRow";

export const TableHeader = styled.thead`
  background-color: var(--white, #f00);
  padding-top: 11px;
  padding-bottom: 11px;
`;

TableHeader.displayName = "TableHeader";

export const TableHeaderCell = withStyledSystemCompatibility([], styled.th`
  border-spacing: 0;
  border: 0;
`);

TableHeaderCell.displayName = "TableHeaderCell";

export default Table;
