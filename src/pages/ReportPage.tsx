import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { buildReportRows, sumRows, groupBy, getPreviousDay } from '@/lib/report';
import { exportToExcel, exportToCSV } from '@/lib/excel';
import type { ReportRow, ReportType } from '@/types';
import { ReportFilters, type ReportFilterValues } from '@/components/ReportFilters';
import { Button } from '@/components/Button';
import { Download, FileSpreadsheet, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

interface ReportPageProps {
  reportType: ReportType;
  title: string;
  subtitle: string;
}

export function ReportPage({ reportType, title, subtitle }: ReportPageProps) {
  const [filters, setFilters] = useState<ReportFilterValues>({
    reportDate: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const [outletOptions, setOutletOptions] = useState<{ value: string; label: string }[]>([]);
  const [managerOptions, setManagerOptions] = useState<{ value: string; label: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [itemOptions, setItemOptions] = useState<{ value: string; label: string }[]>([]);

  const loadFilterOptions = useCallback(async () => {
    const [outlets, managers, items] = await Promise.all([
      supabase.from('outlets').select('name, area_manager, category').order('name'),
      supabase.from('area_managers').select('name').order('name'),
      supabase.from('items').select('name, category').order('name'),
    ]);

    setOutletOptions((outlets.data || []).map((o: { name: string }) => ({ value: o.name, label: o.name })));
    setManagerOptions((managers.data || []).map((m: { name: string }) => ({ value: m.name, label: m.name })));

    const cats = new Set<string>();
    (outlets.data || []).forEach((o: { category: string }) => { if (o.category) cats.add(o.category); });
    (items.data || []).forEach((i: { category: string }) => { if (i.category) cats.add(i.category); });
    setCategoryOptions([...cats].sort().map((c) => ({ value: c, label: c })));

    setItemOptions((items.data || []).map((i: { name: string }) => ({ value: i.name, label: i.name })));
  }, []);

  useMemo(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  const runReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasRun(true);

    try {
      const prevDay = getPreviousDay(filters.reportDate);

      const [sales, purchases, closing, recipes, outlets, items] = await Promise.all([
        supabase.from('sales').select('*').in('date', [prevDay, filters.reportDate]),
        supabase.from('purchases').select('*').in('date', [prevDay, filters.reportDate]),
        supabase.from('closing_stock').select('*').in('date', [prevDay, filters.reportDate]),
        supabase.from('recipes').select('*'),
        supabase.from('outlets').select('*'),
        supabase.from('items').select('*'),
      ]);

      if (sales.error || purchases.error || closing.error || recipes.error || outlets.error || items.error) {
        setError('Failed to load report data. Please try again.');
        setLoading(false);
        return;
      }

      const rows = buildReportRows({
        reportDate: filters.reportDate,
        sales: (sales.data || []) as ReportRow[] as unknown as typeof sales.data,
        purchases: (purchases.data || []) as any,
        closingStock: (closing.data || []) as any,
        recipes: (recipes.data || []) as any,
        outlets: (outlets.data || []) as any,
        items: (items.data || []) as any,
        filters: {
          outlet: filters.outlet,
          area_manager: filters.area_manager,
          category: filters.category,
          item: filters.item,
        },
      });

      setData(rows);
    } catch {
      setError('An error occurred while generating the report.');
    }
    setLoading(false);
  }, [filters]);

  const handleExportExcel = () => {
    const exportRows = getExportRows();
    exportToExcel(exportRows, `${reportType}_report.xlsx`, 'Report');
  };

  const handleExportCSV = () => {
    const exportRows = getExportRows();
    exportToCSV(exportRows, `${reportType}_report.csv`);
  };

  const getExportRows = (): Record<string, string | number>[] => {
    if (reportType === 'outlet') {
      const grouped = groupBy(data, (r) => r.outlet);
      return [...grouped.entries()].map(([outlet, rows]) => ({
        Outlet: outlet,
        ...sumRows(rows) as Record<string, number>,
      }));
    }
    if (reportType === 'item') {
      const grouped = groupBy(data, (r) => r.item);
      return [...grouped.entries()].map(([item, rows]) => ({
        Item: item,
        ...sumRows(rows) as Record<string, number>,
      }));
    }
    if (reportType === 'manager') {
      const grouped = groupBy(data, (r) => r.area_manager || 'Unassigned');
      return [...grouped.entries()].map(([manager, rows]) => ({
        'Area Manager': manager,
        ...sumRows(rows) as Record<string, number>,
      }));
    }
    return data.map((r) => ({
      Date: r.date,
      Outlet: r.outlet,
      Item: r.item,
      Category: r.category,
      'Area Manager': r.area_manager,
      Opening: r.opening,
      Purchase: r.purchase,
      Sales: r.sales,
      Closing: r.closing,
      'Actual Consumption': r.actual_consumption,
      'Ideal Consumption': r.ideal_consumption,
      Variance: r.variance,
      'Ideal Closing': r.ideal_closing,
      'Closing Variance': r.closing_variance,
    }));
  };

  const totals = data.length > 0 ? sumRows(data) : null;

  const renderTable = () => {
    if (loading) {
      return (
        <div className="text-center py-12 text-slate-400 border border-slate-200 rounded-lg bg-white">
          Generating report...
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center py-12 text-red-500 border border-red-200 rounded-lg bg-red-50">
          {error}
        </div>
      );
    }
    if (!hasRun) {
      return (
        <div className="text-center py-12 text-slate-400 border border-slate-200 rounded-lg bg-white">
          Select a Report Date and click Generate to view the report.
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400 border border-slate-200 rounded-lg bg-white">
          No data found for the selected filters. Make sure you have uploaded sales, purchases, and closing stock data.
        </div>
      );
    }

    if (reportType === 'outlet' || reportType === 'item' || reportType === 'manager') {
      const groupKey = reportType === 'outlet' ? 'outlet' : reportType === 'item' ? 'item' : 'area_manager';
      const groupLabel = reportType === 'outlet' ? 'Outlet' : reportType === 'item' ? 'Item' : 'Area Manager';
      const grouped = groupBy(data, (r) => (r as any)[groupKey] || 'Unassigned');

      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">{groupLabel}</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Opening</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Purchase</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Sales</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Closing</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actual Cons.</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Ideal Cons.</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Variance</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Ideal Closing</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Closing Var.</th>
              </tr>
            </thead>
            <tbody>
              {[...grouped.entries()].map(([key, rows]) => {
                const s = sumRows(rows);
                return (
                  <tr key={key} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{key}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(s.opening)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(s.purchase)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(s.sales)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(s.closing)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(s.actual_consumption)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(s.ideal_consumption)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${(s.variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(s.variance)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(s.ideal_closing)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${(s.closing_variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(s.closing_variance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                  <td className="px-4 py-3 text-slate-800">TOTAL</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.opening)}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.purchase)}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.sales)}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.closing)}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.actual_consumption)}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.ideal_consumption)}</td>
                  <td className={`px-4 py-3 text-right ${(totals.variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(totals.variance)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.ideal_closing)}</td>
                  <td className={`px-4 py-3 text-right ${(totals.closing_variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(totals.closing_variance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
    }

    const showVarianceColumns = reportType === 'variance';

    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {!showVarianceColumns && (
                <>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Outlet</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                </>
              )}
              {showVarianceColumns && (
                <>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Outlet</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Item</th>
                </>
              )}
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Opening</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Purchase</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Sales</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Closing</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actual Cons.</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Ideal Cons.</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Variance</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Ideal Closing</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Closing Var.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700 font-medium">{row.outlet}</td>
                <td className="px-4 py-2.5 text-slate-700">{row.item}</td>
                {!showVarianceColumns && <td className="px-4 py-2.5 text-slate-600">{row.category || '-'}</td>}
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.opening)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.purchase)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.sales)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.closing)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.actual_consumption)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.ideal_consumption)}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${row.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmt(row.variance)}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.ideal_closing)}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${row.closing_variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmt(row.closing_variance)}
                </td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                <td className="px-4 py-3 text-slate-800" colSpan={showVarianceColumns ? 2 : 3}>TOTAL</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.opening)}</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.purchase)}</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.sales)}</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.closing)}</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.actual_consumption)}</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.ideal_consumption)}</td>
                <td className={`px-4 py-3 text-right ${(totals.variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmt(totals.variance)}
                </td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.ideal_closing)}</td>
                <td className={`px-4 py-3 text-right ${(totals.closing_variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmt(totals.closing_variance)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runReport} disabled={loading || !filters.reportDate}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
          {data.length > 0 && (
            <>
              <Button variant="secondary" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} />
                Excel
              </Button>
              <Button variant="secondary" onClick={handleExportCSV}>
                <Download size={16} />
                CSV
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Report Date: {filters.reportDate}</strong> &mdash; Opening = previous day closing,
          Purchase = previous day purchase, Sales = previous day sales, Closing = selected date closing.
        </p>
      </div>

      <ReportFilters
        filters={filters}
        onChange={setFilters}
        outlets={outletOptions}
        managers={managerOptions}
        categories={categoryOptions}
        items={itemOptions}
      />

      {renderTable()}
    </div>
  );
}

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return '-';
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}
