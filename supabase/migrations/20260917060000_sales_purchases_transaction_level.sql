/*
# Sales & Purchases — Transaction-Level Import Support

1. Why
   The real Sale CSV and Purchase Excel exports are transaction-level:
   the same Date + Outlet + Item can legitimately appear multiple times
   (different invoices for sales, different POs for purchases). The
   original schema enforced UNIQUE (date, outlet, item) on both tables,
   which would silently collapse/reject those valid duplicate rows.

2. Changes
   - Drop the UNIQUE (date, outlet, item) constraint on `sales` and on
     `purchases`. Multiple rows per Date + Outlet + Item are now valid.
   - Add the extra columns needed to hold the real import fields:
       sales:     category text, sap_code text, invoice_no text
       purchases: sku_code text, po_no text, uom text
   - Add supporting indexes (invoice_no, po_no) for lookups.
   - `closing_stock` is intentionally left unchanged: it must stay
     unique by (date, outlet, item), since closing is a snapshot, not
     a transaction log.

3. Date-wise re-upload behaviour (handled in the app, not in SQL)
   For every date present in an uploaded Sales or Purchase file, the
   app deletes existing rows for that date in that table, then inserts
   the freshly parsed rows for that date. Other dates are untouched.
   Re-uploading the same date therefore replaces it instead of
   duplicating it, while still allowing multiple transaction rows
   within that date.
*/

-- Sales: allow multiple transaction rows per date/outlet/item
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_date_outlet_item_key;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS category text DEFAULT '';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sap_code text DEFAULT '';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_no text DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales (invoice_no);

-- Purchases: allow multiple transaction rows per date/outlet/item
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_date_outlet_item_key;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sku_code text DEFAULT '';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS po_no text DEFAULT '';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS uom text DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_purchases_po_no ON purchases (po_no);
