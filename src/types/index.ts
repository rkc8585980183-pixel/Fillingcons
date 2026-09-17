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

export interface SalesRecord {
  id: string;
  date: string;
  outlet: string;
  item: string;
  qty: number;
  created_at?: string;
}

export interface PurchaseRecord {
  id: string;
  date: string;
  outlet: string;
  item: string;
  qty: number;
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

export interface ReportRow {
  date: string;
  outlet: string;
  item: string;
  category: string;
  area_manager: string;
  opening: number;
  purchase: number;
  sales: number;
  closing: number;
  actual_consumption: number;
  ideal_consumption: number;
  variance: number;
  ideal_closing: number;
  closing_variance: number;
}

export type ReportType = 'daily' | 'outlet' | 'item' | 'manager' | 'variance';
