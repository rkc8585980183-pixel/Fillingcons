import type {
  SalesRecord,
  PurchaseRecord,
  ClosingStockRecord,
  Recipe,
  Outlet,
  Item,
  ReportRow,
} from '@/types';

export interface ReportInput {
  reportDate: string;
  sales: SalesRecord[];
  purchases: PurchaseRecord[];
  closingStock: ClosingStockRecord[];
  recipes: Recipe[];
  outlets: Outlet[];
  items: Item[];
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

export function buildReportRows(input: ReportInput): ReportRow[] {
  const { reportDate, sales, purchases, closingStock, recipes, outlets, items, filters } = input;

  const prevDay = getPreviousDay(reportDate);

  const recipeMap = new Map<string, number>();
  for (const r of recipes) {
    recipeMap.set(r.item_name.toLowerCase(), r.filled_qty_gram);
  }

  const outletMap = new Map<string, Outlet>();
  for (const o of outlets) {
    outletMap.set(o.name.toLowerCase(), o);
  }

  const itemMap = new Map<string, Item>();
  for (const it of items) {
    itemMap.set(it.name.toLowerCase(), it);
  }

  const prevClosing = new Map<string, number>();
  for (const c of closingStock) {
    if (c.date === prevDay) {
      prevClosing.set(`${c.outlet.toLowerCase()}|${c.item.toLowerCase()}`, c.qty);
    }
  }

  const prevPurchases = new Map<string, number>();
  for (const p of purchases) {
    if (p.date === prevDay) {
      prevPurchases.set(`${p.outlet.toLowerCase()}|${p.item.toLowerCase()}`, p.qty);
    }
  }

  const prevSales = new Map<string, number>();
  for (const s of sales) {
    if (s.date === prevDay) {
      prevSales.set(`${s.outlet.toLowerCase()}|${s.item.toLowerCase()}`, s.qty);
    }
  }

  const todayClosing = new Map<string, number>();
  for (const c of closingStock) {
    if (c.date === reportDate) {
      todayClosing.set(`${c.outlet.toLowerCase()}|${c.item.toLowerCase()}`, c.qty);
    }
  }

  const allKeys = new Set<string>();
  prevClosing.forEach((_, k) => allKeys.add(k));
  prevPurchases.forEach((_, k) => allKeys.add(k));
  prevSales.forEach((_, k) => allKeys.add(k));
  todayClosing.forEach((_, k) => allKeys.add(k));

  const rows: ReportRow[] = [];

  for (const key of allKeys) {
    const [outletName, itemName] = key.split('|');
    const outlet = outletName.charAt(0).toUpperCase() + outletName.slice(1);
    const item = itemName.charAt(0).toUpperCase() + itemName.slice(1);

    const outletInfo = outletMap.get(outletName);
    const itemInfo = itemMap.get(itemName);
    const category = itemInfo?.category || outletInfo?.category || '';
    const areaManager = outletInfo?.area_manager || '';

    if (filters.outlet && outlet.toLowerCase() !== filters.outlet.toLowerCase()) continue;
    if (filters.area_manager && areaManager.toLowerCase() !== filters.area_manager.toLowerCase()) continue;
    if (filters.category && category.toLowerCase() !== filters.category.toLowerCase()) continue;
    if (filters.item && item.toLowerCase() !== filters.item.toLowerCase()) continue;

    const opening = prevClosing.get(key) ?? 0;
    const purchase = prevPurchases.get(key) ?? 0;
    const salesQty = prevSales.get(key) ?? 0;
    const closing = todayClosing.get(key) ?? 0;

    const actualConsumption = opening + purchase - closing;
    const recipeGram = recipeMap.get(itemName) ?? 0;
    const idealConsumption = (salesQty * recipeGram) / 1000;
    const variance = actualConsumption - idealConsumption;
    const idealClosing = opening + purchase - idealConsumption;
    const closingVariance = closing - idealClosing;

    rows.push({
      date: reportDate,
      outlet,
      item,
      category,
      area_manager: areaManager,
      opening,
      purchase,
      sales: salesQty,
      closing,
      actual_consumption: round4(actualConsumption),
      ideal_consumption: round4(idealConsumption),
      variance: round4(variance),
      ideal_closing: round4(idealClosing),
      closing_variance: round4(closingVariance),
    });
  }

  return rows.sort((a, b) => a.outlet.localeCompare(b.outlet) || a.item.localeCompare(b.item));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
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
    sales: round4(rows.reduce((s, r) => s + r.sales, 0)),
    closing: round4(rows.reduce((s, r) => s + r.closing, 0)),
    actual_consumption: round4(rows.reduce((s, r) => s + r.actual_consumption, 0)),
    ideal_consumption: round4(rows.reduce((s, r) => s + r.ideal_consumption, 0)),
    variance: round4(rows.reduce((s, r) => s + r.variance, 0)),
    ideal_closing: round4(rows.reduce((s, r) => s + r.ideal_closing, 0)),
    closing_variance: round4(rows.reduce((s, r) => s + r.closing_variance, 0)),
  };
}
