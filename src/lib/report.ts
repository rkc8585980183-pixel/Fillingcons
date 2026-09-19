import type {
  SalesRecord,
  PurchaseRecord,
  ClosingStockRecord,
  RecipeMapping,
  Outlet,
  ReportRow,
} from '@/types';

export interface ReportInput {
  reportDate: string;
  sales: SalesRecord[];
  purchases: PurchaseRecord[];
  closingStock: ClosingStockRecord[];
  recipeMapping: RecipeMapping[];
  outlets: Outlet[];
  filters: ReportFilters;
}

export interface ReportFilters {
  outlet?: string;
  area_manager?: string;
  category?: string;
  item?: string;
}

export function getPreviousDay(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Builds one row per (Outlet, Ingredient/Filling) for the report date.
 *
 * Opening  = previous day's Closing Stock for that outlet+ingredient
 * Purchase = previous day's Purchases summed for that outlet+ingredient
 * Closing  = report date's Closing Stock for that outlet+ingredient
 * Actual Consumption = Opening + Purchase - Closing
 *
 * Ideal Consumption for an ingredient = sum, over every recipe_mapping
 * row whose ingredient matches, of:
 *   SaleQty(sale_item, outlet, previous day) * qty_use_gram / filling_weight
 * A combo sale item appears in multiple recipe_mapping rows (one per
 * ingredient it uses) and contributes its full sale quantity to each.
 */
export function buildReportRows(input: ReportInput): ReportRow[] {
  const { reportDate, sales, purchases, closingStock, recipeMapping, outlets, filters } = input;
  const prevDay = getPreviousDay(reportDate);

  const outletMap = new Map<string, Outlet>();
  for (const o of outlets) {
    outletMap.set(o.name.toLowerCase(), o);
  }

  // Previous day's sale qty per (outlet, sale_item)
  const prevSalesQty = new Map<string, number>();
  for (const s of sales) {
    if (s.date === prevDay) {
      const key = `${s.outlet.toLowerCase()}|${s.item.toLowerCase()}`;
      prevSalesQty.set(key, (prevSalesQty.get(key) ?? 0) + s.qty);
    }
  }

  // Ingredients grouped for lookup, and a category/uom to display per ingredient
  const recipesByIngredient = new Map<string, RecipeMapping[]>();
  const ingredientMeta = new Map<string, { category: string; uom: string }>();
  for (const r of recipeMapping) {
    const ingredientKey = r.ingredient_name.toLowerCase();
    const list = recipesByIngredient.get(ingredientKey) || [];
    list.push(r);
    recipesByIngredient.set(ingredientKey, list);
    if (!ingredientMeta.has(ingredientKey)) {
      ingredientMeta.set(ingredientKey, { category: r.category || '', uom: r.uom || '' });
    }
  }

  const prevClosing = new Map<string, number>();
  for (const c of closingStock) {
    if (c.date === prevDay) {
      prevClosing.set(`${c.outlet.toLowerCase()}|${c.item.toLowerCase()}`, c.qty);
    }
  }

  const todayClosing = new Map<string, number>();
  for (const c of closingStock) {
    if (c.date === reportDate) {
      todayClosing.set(`${c.outlet.toLowerCase()}|${c.item.toLowerCase()}`, c.qty);
    }
  }

  const prevPurchases = new Map<string, number>();
  for (const p of purchases) {
    if (p.date === prevDay) {
      const key = `${p.outlet.toLowerCase()}|${p.item.toLowerCase()}`;
      prevPurchases.set(key, (prevPurchases.get(key) ?? 0) + p.qty);
    }
  }

  // Every (outlet, ingredient) combination that has stock movement OR a recipe mapping
  const allKeys = new Set<string>();
  prevClosing.forEach((_, k) => allKeys.add(k));
  prevPurchases.forEach((_, k) => allKeys.add(k));
  todayClosing.forEach((_, k) => allKeys.add(k));
  // Also add keys for every outlet that sold something whose recipe maps to an ingredient
  const outletsWithSales = new Set<string>();
  for (const s of sales) {
    if (s.date === prevDay) outletsWithSales.add(s.outlet.toLowerCase());
  }
  for (const outlet of outletsWithSales) {
    for (const ingredientKey of recipesByIngredient.keys()) {
      allKeys.add(`${outlet}|${ingredientKey}`);
    }
  }

  const rows: ReportRow[] = [];

  for (const key of allKeys) {
    const [outletName, ingredientName] = key.split('|');
    const outlet = outletName.charAt(0).toUpperCase() + outletName.slice(1);
    const ingredient = ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1);

    const outletInfo = outletMap.get(outletName);
    const meta = ingredientMeta.get(ingredientName);
    const category = meta?.category || outletInfo?.category || '';
    const uom = meta?.uom || '';
    const areaManager = outletInfo?.area_manager || '';

    if (filters.outlet && outlet.toLowerCase() !== filters.outlet.toLowerCase()) continue;
    if (filters.area_manager && areaManager.toLowerCase() !== filters.area_manager.toLowerCase()) continue;
    if (filters.category && category.toLowerCase() !== filters.category.toLowerCase()) continue;
    if (filters.item && ingredient.toLowerCase() !== filters.item.toLowerCase()) continue;

    const opening = prevClosing.get(key) ?? 0;
    const purchase = prevPurchases.get(key) ?? 0;
    const closing = todayClosing.get(key) ?? 0;
    const actualConsumption = opening + purchase - closing;

    let idealConsumption = 0;
    const recipeRows = recipesByIngredient.get(ingredientName) || [];
    for (const r of recipeRows) {
      const saleKey = `${outletName}|${r.sale_item.toLowerCase()}`;
      const saleQty = prevSalesQty.get(saleKey) ?? 0;
      if (saleQty > 0 && r.filling_weight > 0) {
        idealConsumption += (saleQty * r.qty_use_gram) / r.filling_weight;
      }
    }

    const variance = actualConsumption - idealConsumption;

    rows.push({
      date: reportDate,
      outlet,
      item: ingredient,
      category,
      area_manager: areaManager,
      uom,
      opening,
      purchase,
      closing,
      actual_consumption: round4(actualConsumption),
      ideal_consumption: round4(idealConsumption),
      variance: round4(variance),
      remark: '',
      remark2: '',
    });
  }

  return rows.sort((a, b) => a.outlet.localeCompare(b.outlet) || a.item.localeCompare(b.item));
}

export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export function sumRows(rows: ReportRow[]): Partial<ReportRow> {
  return {
    opening: round4(rows.reduce((s, r) => s + r.opening, 0)),
    purchase: round4(rows.reduce((s, r) => s + r.purchase, 0)),
    closing: round4(rows.reduce((s, r) => s + r.closing, 0)),
    actual_consumption: round4(rows.reduce((s, r) => s + r.actual_consumption, 0)),
    ideal_consumption: round4(rows.reduce((s, r) => s + r.ideal_consumption, 0)),
    variance: round4(rows.reduce((s, r) => s + r.variance, 0)),
  };
}
