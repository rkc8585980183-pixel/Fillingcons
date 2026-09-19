/*
# Filling / Recipe Mapping (Bill of Materials)

1. Why
   A single sale item (especially combo items) can use MULTIPLE raw
   material fillings/ingredients, each in a different quantity. The old
   `recipes` table only supported one filling per item name, which
   cannot represent combos like "Biscoff & Blueberry Cheesecake Combo"
   (uses both Blueberry Filling AND Lotus Biscoff Spread).

2. New table: recipe_mapping
   - sale_item        : the sold item name, as it appears in Sales data
   - category          : sale item's category (informational)
   - ingredient_code   : short code for the raw material (e.g. FL007)
   - ingredient_name   : raw material / filling name, expected to match
                         the Item name used in Purchases / Closing Stock
   - filling_weight    : reference pack weight in grams for this
                         ingredient (e.g. 400, 1000) — used as the
                         divisor in the Ideal Consumption formula
   - uom               : unit of measure for the ingredient (e.g. Gms)
   - qty_use_gram      : grams of this ingredient used per ONE unit of
                         the sale item

   Ideal Consumption per (outlet, ingredient) on a given date =
     SUM over every recipe_mapping row for that ingredient of
       ( SaleQty(sale_item, outlet, previous day) * qty_use_gram / filling_weight )

   A sale item may appear in multiple rows (one per ingredient it
   uses) — each row is a separate, independent BOM line, so a combo's
   sale quantity contributes fully to every ingredient it lists.

3. Constraints
   - UNIQUE (sale_item, ingredient_code): re-uploading the same
     sale-item + ingredient combination updates that line instead of
     duplicating it.

4. Security
   - RLS enabled, anon+authenticated full CRUD (matches the rest of
     this single-user app).
*/

CREATE TABLE IF NOT EXISTS recipe_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item text NOT NULL,
  category text DEFAULT '',
  ingredient_code text DEFAULT '',
  ingredient_name text NOT NULL,
  filling_weight numeric NOT NULL DEFAULT 0,
  uom text DEFAULT '',
  qty_use_gram numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (sale_item, ingredient_code)
);
ALTER TABLE recipe_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_recipe_mapping" ON recipe_mapping FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_recipe_mapping" ON recipe_mapping FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_recipe_mapping" ON recipe_mapping FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_recipe_mapping" ON recipe_mapping FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_recipe_mapping_sale_item ON recipe_mapping (sale_item);
CREATE INDEX IF NOT EXISTS idx_recipe_mapping_ingredient_name ON recipe_mapping (ingredient_name);
