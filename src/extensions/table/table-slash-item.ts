import { Table } from 'lucide-react';
import { insertTable } from '../../engine/commands/table-commands';
import type { SlashItem } from '../ui-types';
import type { TableLabels } from './table-labels';

/** The size of a table the slash command inserts. */
export const NEW_TABLE = { rows: 3, cols: 3 } as const;

export const tableSlashItem = (labels: TableLabels): SlashItem => ({
  id: 'table',
  title: labels.table,
  description: labels.tableDescription,
  group: 'advanced',
  icon: Table,
  keywords: ['grid', 'rows', 'columns', 'spreadsheet', '|'],
  command: () => insertTable(NEW_TABLE.rows, NEW_TABLE.cols),
});
