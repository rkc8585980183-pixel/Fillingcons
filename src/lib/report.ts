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
 * See buildReportRows doc below for the full formula breakdown.
 */
export function buildReportRows(input: ReportInput): ReportRow[] {
  const { reportDate, sales, purchases, closingStock, recipeMapping, outlets, filters } = input;
  const prevDay = getPreviousDay(reportDate);

  const outletMap = new Map<string, Outlet>();
  for (const o of outlets) {
    outletMap.set(o.name.toLowerCase(), o);
  }

  const prevSalesQty = new Map<string, number>();
  for (const s of sales) {
    if (s.date === prevDay) {
      const key = `${s.outlet.toLowerCase()}|${s.item.toLowerCase()}`;
      prevSalesQty.set(key, (prevSalesQty.get(key) ?? 0) + s.qty);
    }
  }

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

  const allKeys = new Set<string>();
  prevClosing.forEach((_, k) => allKeys.add(k));
  prevPurchases.forEach((_, k) => allKeys.add(k));
  todayClosing.forEach((_, k) => allKeys.add(k));
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
    const expectedClosing = opening + purchase - idealConsumption;

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
      expected_closing: round4(expectedClosing),
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
    expected_closing: round4(rows.reduce((s, r) => s + r.expected_closing, 0)),
  };
}

/**
 * Remark: =IF(OR(Ideal=ABS(Variance), ABS(Variance)<=Margin), "Acceptable",
 *          IF(ABS(Variance)>=Margin, "Need Attention", "OK"))
 */
export function computeRemark(ideal: number, variance: number, margin: number): string {
  if (ideal === Math.abs(variance) || Math.abs(variance) <= margin) return 'Acceptable';
  if (Math.abs(variance) >= margin) return 'Need Attention';
  return 'OK';
}

/**
 * Remark 2: =IF(Ideal>=ABS(Actual), "OK",
 *             IF(ABS(Actual)>=Ideal, "Closing Mistake", "Manageable"))
 */
export function computeRemark2(ideal: number, actual: number): string {
  if (ideal >= Math.abs(actual)) return 'OK';
  if (Math.abs(actual) >= ideal) return 'Closing Mistake';
  return 'Manageable';
}

/** Combines every ingredient into one row per outlet (for "All Items" master view). */
export function aggregateByOutlet(rows: ReportRow[]): ReportRow[] {
  const map = new Map<string, ReportRow>();
  for (const r of rows) {
    const key = r.outlet.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...r, item: 'All Items', category: '', uom: r.uom });
    } else {
      existing.opening = round4(existing.opening + r.opening);
      existing.purchase = round4(existing.purchase + r.purchase);
      existing.closing = round4(existing.closing + r.closing);
      existing.actual_consumption = round4(existing.actual_consumption + r.actual_consumption);
      existing.ideal_consumption = round4(existing.ideal_consumption + r.ideal_consumption);
      existing.variance = round4(existing.variance + r.variance);
      existing.expected_closing = round4(existing.expected_closing + r.expected_closing);
      if (existing.uom !== r.uom) existing.uom = '';
    }
  }
  return Array.from(map.values()).sort((a, b) => a.outlet.localeCompare(b.outlet));
}

export interface SaleWiseRow {
  date: string;
  outlet: string;
  sale_item: string;
  category: string;
  sale_qty: number;
  ideal_consumption: number;
}

/**
 * Outlet-wise breakdown of Ideal Consumption driven directly by Sales
 * on the given date (no day-shift — this shows what a date's own sales
 * imply, independent of the main stock-based report).
 */
export function buildSaleWiseIdealConsumption(
  saleDate: string,
  sales: SalesRecord[],
  recipeMapping: RecipeMapping[]
): SaleWiseRow[] {
  const salesForDate = sales.filter((s) => s.date === saleDate);

  const saleQtyMap = new Map<string, number>();
  for (const s of salesForDate) {
    const key = `${s.outlet.toLowerCase()}|${s.item.toLowerCase()}`;
    saleQtyMap.set(key, (saleQtyMap.get(key) ?? 0) + s.qty);
  }

  const recipesBySaleItem = new Map<string, RecipeMapping[]>();
  for (const r of recipeMapping) {
    const key = r.sale_item.toLowerCase();
    const list = recipesBySaleItem.get(key) || [];
    list.push(r);
    recipesBySaleItem.set(key, list);
  }

  const rows: SaleWiseRow[] = [];
  const seen = new Set<string>();

  for (const s of salesForDate) {
    const key = `${s.outlet.toLowerCase()}|${s.item.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const saleQty = saleQtyMap.get(key) ?? 0;
    const recipeRows = recipesBySaleItem.get(s.item.toLowerCase()) || [];
    let ideal = 0;
    for (const r of recipeRows) {
      if (r.filling_weight > 0) {
        ideal += (saleQty * r.qty_use_gram) / r.filling_weight;
      }
    }

    rows.push({
      date: saleDate,
      outlet: s.outlet,
      sale_item: s.item,
      category: s.category || recipeRows[0]?.category || '',
      sale_qty: saleQty,
      ideal_consumption: round4(ideal),
    });
  }

  return rows.sort((a, b) => a.outlet.localeCompare(b.outlet) || a.sale_item.localeCompare(b.sale_item));
}
