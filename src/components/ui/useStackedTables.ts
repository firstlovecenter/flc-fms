'use client';
import { useEffect } from 'react';

/**
 * On phones every table in the scope shows as a stack of cards, one per row,
 * with each value under its column's name (see stacked-tables-css.ts). The names
 * come from `data-label` on each cell; this copies them from the table's header
 * so no page has to. A cell that already has `data-label` keeps it, and an
 * empty header (a checkbox or an actions column) gives an empty label.
 *
 * A header cell can also say how its column shows on a phone with
 * `data-mobile` (see stacked-tables-css.ts): "title", "badge", "body", "meta" or
 * "hide". It is copied to the column's cells the same way, so a page only marks
 * its header. A cell that sets `data-mobile` itself keeps it.
 *
 * Tables render and re-render as data arrives, so a MutationObserver relabels
 * them, at most once a frame. Dialogs are portalled to <body>, hence observing
 * the whole document rather than the scope.
 */

interface Column {
  label: string;
  mobile: string | null;
}

function headerColumns(table: HTMLTableElement): Column[] {
  const row = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!row) return [];
  const columns: Column[] = [];
  for (const cell of Array.from(row.cells)) {
    const label = (cell.getAttribute('aria-label') ?? cell.textContent ?? '').trim();
    const mobile = cell.getAttribute('data-mobile');
    for (let i = 0; i < cell.colSpan; i++) columns.push({ label, mobile });
  }
  return columns;
}

/** Sets `attr` from the header unless the page set it on the cell itself. */
function copyFromHeader(cell: HTMLTableCellElement, attr: string, value: string | null) {
  const autoKey = attr === 'data-label' ? 'labelAuto' : 'mobileAuto';
  if (cell.hasAttribute(attr) && cell.dataset[autoKey] !== '1') return;
  if (value === null) {
    if (cell.hasAttribute(attr)) cell.removeAttribute(attr);
    delete cell.dataset[autoKey];
    return;
  }
  if (cell.getAttribute(attr) !== value) cell.setAttribute(attr, value);
  cell.dataset[autoKey] = '1';
}

/**
 * Tables that mark no column get a compact card automatically: the first
 * labelled column is the title, a "Status" column the pill, and the rest one
 * wrapping line of "Label: value" facts. Cells holding controls keep their own
 * row. data-stack="labels" on the table keeps the plain label-and-value card.
 */
function autoMobile(table: HTMLTableElement, columns: Column[]): (string | null)[] {
  if (table.dataset.stack === 'labels' || columns.some((c) => c.mobile)) {
    return columns.map((c) => c.mobile);
  }
  const titleIndex = columns.findIndex((c) => c.label !== '');
  return columns.map((c, i) => {
    if (c.label === '') return null;
    if (i === titleIndex) return 'title';
    if (/^(status|state)$/i.test(c.label)) return 'badge';
    return 'meta';
  });
}

const CONTROLS = 'button, input, select, textarea, [role="button"], [data-slot="button"]';

function labelTable(table: HTMLTableElement) {
  const columns = headerColumns(table);
  if (!columns.length) return;
  const mobiles = autoMobile(table, columns);
  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      let col = 0;
      for (const cell of Array.from(row.cells)) {
        // A cell spanning columns (an empty or loading row) needs no label. Leaving
        // it untouched also keeps server-rendered placeholder rows identical to
        // what React hydrates.
        const column = cell.colSpan > 1 ? undefined : columns[col];
        let mobile = column ? mobiles[col] : null;
        // Facts are run together as text; a cell with controls keeps its own row.
        if (mobile === 'meta' && cell.querySelector(CONTROLS)) mobile = null;
        copyFromHeader(cell, 'data-label', column ? column.label : null);
        copyFromHeader(cell, 'data-mobile', mobile);
        col += cell.colSpan;
      }
    }
  }
}

/** `scope` is the selector passed to stackedTablesCss(), e.g. '#admin-main'. */
export function useStackedTables(scope: string) {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      frame = 0;
      document
        .querySelectorAll<HTMLTableElement>(
          `${scope} table, [role="dialog"] table, [role="alertdialog"] table`
        )
        .forEach(labelTable);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scope]);
}
