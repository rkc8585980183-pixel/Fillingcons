import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  AreaManager, Outlet, Item, Weight, Recipe, RecipeMapping,
  SalesRecord, PurchaseRecord, ClosingStockRecord,
} from '@/types';

export function useTable<T extends { id: string }>(
  tableName: string,
  orderColumn = 'created_at'
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderColumn);
    if (error) {
      setError(error.message);
    } else {
      setRows((data || []) as T[]);
      setError(null);
    }
    setLoading(false);
  }, [tableName, orderColumn]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const insert = useCallback(async (row: Partial<T>) => {
    const { error } = await supabase.from(tableName).insert(row);
    if (error) return { error: error.message };
    await fetch();
    return { error: null };
  }, [tableName, fetch]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    const { error } = await supabase.from(tableName).update(updates).eq('id', id);
    if (error) return { error: error.message };
    await fetch();
    return { error: null };
  }, [tableName, fetch]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) return { error: error.message };
    await fetch();
    return { error: null };
  }, [tableName, fetch]);

  const upsert = useCallback(async (rows: Partial<T>[], onConflict: string) => {
    const { error } = await supabase.from(tableName).upsert(rows, { onConflict });
    if (error) return { error: error.message };
    await fetch();
    return { error: null };
  }, [tableName, fetch]);

  return { rows, loading, error, insert, update, remove, upsert, refetch: fetch };
}

export function useAreaManagers() {
  return useTable<AreaManager>('area_managers', 'name');
}
export function useOutlets() {
  return useTable<Outlet>('outlets', 'name');
}
export function useItems() {
  return useTable<Item>('items', 'name');
}
export function useWeights() {
  return useTable<Weight>('weights', 'unit');
}
export function useRecipes() {
  return useTable<Recipe>('recipes', 'item_name');
}
export function useRecipeMapping() {
  return useTable<RecipeMapping>('recipe_mapping', 'sale_item');
}
export function useSales() {
  return useTable<SalesRecord>('sales', 'date');
}
export function usePurchases() {
  return useTable<PurchaseRecord>('purchases', 'date');
}
export function useClosingStock() {
  return useTable<ClosingStockRecord>('closing_stock', 'date');
}
