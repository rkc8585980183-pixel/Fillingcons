export interface AreaManager {
  id: string;
  name: string;
  created_at?: string;
}

export interface Outlet {
  id: string;
  name: string;
  area_manager: string;
  category: string;
  created_at?: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  unit: string;
  created_at?: string;
}

export interface Weight {
  id: string;
  unit: string;
  factor: number;
  created_at?: string;
}

export interface Recipe {
  id: string;
  item_name: string;
  filled_qty_gram: number;
  created_at?: string;
}

/** Bill of materials: one sale item can map to multiple ingredient rows (combos). */
export interface RecipeMapping {
  id: string;
  sale_item: string;
  category: string;
  ingredient_code: string;
  ingredient_name: string;
  filling_weight: number;
  uom: string;
  qty_use_gram: number;
  created_at?: string;
}

export interface SalesRecord {
  id: string;
  date: string;
  outlet: string;
  item: string;
  qty: number;
  category?: string;
  sap_code?: string;
  invoice_no?: string;
  created_at?: string;
}

export interface PurchaseRecord {
  id: string;
  date: string;
  outlet: string;
  item: string;
  qty: number;
  sku_code?: string;
  po_no?: string;
  uom?: string;
  created_at?: string;
}

export interface ClosingStockRecord {
  id: string;
  date: string;
  outlet: string;
  item: string;
  qty: number;
  created_at?: string;
}

/** One row = one (outlet, ingredient/filling) for a report date. */
export interface ReportRow {
  date: string;
  outlet: string;
  item: string;
  category: string;
  area_manager: string;
  uom: string;
  opening: number;
  purchase: number;
  closing: number;
  actual_consumption: number;
  ideal_consumption: number;
  variance: number;
  expected_closing: number;
  remark: string;
  remark2: string;
}

export type ReportType = 'daily' | 'outlet' | 'item' | 'manager' | 'variance';
