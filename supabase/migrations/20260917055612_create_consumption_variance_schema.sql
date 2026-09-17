/*
# Consumption & Variance Report Module — Database Schema

1. Purpose
   This schema supports a single-user Consumption & Variance Report application.
   It stores sales, purchases, and closing stock data uploaded via Excel/CSV,
   along with mapping panels for outlets, items, area managers, weights, and recipes.
   The app uses these tables to compute Actual Consumption, Ideal Consumption,
   Variance, and Ideal Closing based on the user's Excel report logic.

2. New Tables
   - `area_managers` — master list of area managers (id, name, created_at)
   - `outlets` — master list of outlets with area manager and category (id, name, area_manager, category, created_at)
   - `items` — master list of items with category and unit (id, name, category, unit, created_at)
   - `weights` — unit-to-KG conversion factors (id, unit, factor, created_at)
   - `recipes` — recipe master with filled qty in grams per piece (id, item_name, filled_qty_gram, created_at)
   - `sales` — daily sales records keyed by date + outlet + item (id, date, outlet, item, qty, created_at)
   - `purchases` — daily purchase records keyed by date + outlet + item (id, date, outlet, item, qty, created_at)
   - `closing_stock` — daily closing stock keyed by date + outlet + item (id, date, outlet, item, qty, created_at)

3. Constraints
   - Unique constraints on (date, outlet, item) for sales, purchases, and closing_stock
     so that re-uploading the same date/outlet/item updates the existing row.
   - Unique constraint on name for area_managers, outlets, and items.
   - Unique constraint on item_name for recipes.
   - Unique constraint on unit for weights.

4. Indexes
   - Indexes on date, outlet, and item for sales, purchases, and closing_stock
     to speed up filtering and report queries.

5. Security
   - RLS enabled on every table.
   - All tables allow anon + authenticated full CRUD (single-user app, no login).
   - USING (true) / WITH CHECK (true) is acceptable here because the data
     is intentionally shared/public for this single-user application.
*/

-- Area Managers
CREATE TABLE IF NOT EXISTS area_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE area_managers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_area_managers" ON area_managers;
CREATE POLICY "anon_select_area_managers" ON area_managers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_area_managers" ON area_managers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_area_managers" ON area_managers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_area_managers" ON area_managers FOR DELETE TO anon, authenticated USING (true);

-- Outlets
CREATE TABLE IF NOT EXISTS outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  area_manager text DEFAULT '',
  category text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_outlets" ON outlets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_outlets" ON outlets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_outlets" ON outlets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_outlets" ON outlets FOR DELETE TO anon, authenticated USING (true);

-- Items
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text DEFAULT '',
  unit text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_items" ON items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_items" ON items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_items" ON items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_items" ON items FOR DELETE TO anon, authenticated USING (true);

-- Weights
CREATE TABLE IF NOT EXISTS weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit text UNIQUE NOT NULL,
  factor numeric NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_weights" ON weights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_weights" ON weights FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_weights" ON weights FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_weights" ON weights FOR DELETE TO anon, authenticated USING (true);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text UNIQUE NOT NULL,
  filled_qty_gram numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_recipes" ON recipes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_recipes" ON recipes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_recipes" ON recipes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_recipes" ON recipes FOR DELETE TO anon, authenticated USING (true);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  outlet text NOT NULL,
  item text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (date, outlet, item)
);
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_sales" ON sales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_sales" ON sales FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_sales" ON sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_sales" ON sales FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (date);
CREATE INDEX IF NOT EXISTS idx_sales_outlet ON sales (outlet);
CREATE INDEX IF NOT EXISTS idx_sales_item ON sales (item);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  outlet text NOT NULL,
  item text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (date, outlet, item)
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_purchases" ON purchases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_purchases" ON purchases FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_purchases" ON purchases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_purchases" ON purchases FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases (date);
CREATE INDEX IF NOT EXISTS idx_purchases_outlet ON purchases (outlet);
CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchases (item);

-- Closing Stock
CREATE TABLE IF NOT EXISTS closing_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  outlet text NOT NULL,
  item text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (date, outlet, item)
);
ALTER TABLE closing_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_closing_stock" ON closing_stock FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_closing_stock" ON closing_stock FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_closing_stock" ON closing_stock FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_closing_stock" ON closing_stock FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_closing_stock_date ON closing_stock (date);
CREATE INDEX IF NOT EXISTS idx_closing_stock_outlet ON closing_stock (outlet);
CREATE INDEX IF NOT EXISTS idx_closing_stock_item ON closing_stock (item);
