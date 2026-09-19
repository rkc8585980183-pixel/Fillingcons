import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { ReportFilters, type ReportFilterValues } from '@/components/ReportFilters';
import { useSales, usePurchases, useClosingStock, useOutlets, useAreaManagers, useRecipeMapping } from '@/hooks/useTable';
import { buildReportRows, sumRows } from '@/lib/report';
import { exportToExcel } from '@/lib/excel';
import type { ReportRow, ReportType } from '@/types';
import { Download } from 'lucide-react';

interface ReportPageProps {
  reportType: ReportType;
  title: string;
  subtitle: string;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function ReportPage({ title, subtitle }: ReportPageProps) {
  const { rows: sales } = useSales();
  const { rows: purchases } = usePurchases();
  const { rows: closingStock } = useClosingStock();
  const { rows: outlets } = useOutlets();
  const { rows: managers } = useAreaManagers();
  const { rows: recipeMapping } = useRecipeMapping();

  const [filters, setFilters] = useState<ReportFilterValues>({ reportDate: today() });
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [remarks, setRemarks] = useState<Record<string, { remark: string; remark2: string }>>({});

  const outletOptions = useMemo(
    () => outlets.map((o) => ({ value: o.name, label: o.name })),
    [outlets]
  );
  const managerOptions = useMemo(
    () => managers.map((m) => ({ value: m.name, label: m.name })),
    [managers]
  );
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    recipeMapping.forEach((r) => r.category && set.add(r.category));
    outlets.forEach((o) => o.category && set.add(o.category));
    return Array.from(set).sort().map((c) => ({ value: c, label: c }));
  }, [recipeMapping, outlets]);
  const itemOptions = useMemo(() => {
    const set = new Set<string>();
    recipeMapping.forEach((r) => r.ingredient_name && set.add(r.ingredient_name));
    return Array.from(set).sort().map((i) => ({ value: i, label: i }));
  }, [recipeMapping]);

  useEffect(() => {
    const built = buildReportRows({
      reportDate: filters.reportDate,
      sales,
      purchases,
      closingStock,
      recipeMapping,
      outlets,
      filters: {
        outlet: filters.outlet,
        area_manager: filters.area_manager,
        category: filters.category,
        item: filters.item,
      },
    });
    setRows(built);
  }, [filters, sales, purchases, closingStock, recipeMapping, outlets]);

  const rowKey = (r: ReportRow) => `${r.date}|${r.outlet}|${r.item}`;

  const updateRemark = (r: ReportRow, field: 'remark' | 'remark2', value: string) => {
    setRemarks((prev) => ({
      ...prev,
      [rowKey(r)]: { ...prev[rowKey(r)], remark: prev[rowKey(r)]?.remark ?? '', remark2: prev[rowKey(r)]?.remark2 ?? '', [field]: value },
    }));
  };

  const rowsWithRemarks = rows.map((r) => ({
    ...r,
    remark: remarks[rowKey(r)]?.remark ?? '',
    remark2: remarks[rowKey(r)]?.remark2 ?? '',
  }));

  const totals = sumRows(rowsWithRemarks);

  const handleDownload = () => {
    const data = rowsWithRemarks.map((r) => ({
      'Area Manager': r.area_manager,
      'Outlet Name': r.outlet,
      'Item': r.item,
      'Category': r.category,
      'UOM': r.uom,
      'Day-1 Closing Stock (Opening)': r.opening,
      'Day-1 Purchase': r.purchase,
      'Day Closing Stock': r.closing,
      'Actual Consumption': r.actual_consumption,
      'Ideal Consumption (as per sale)': r.ideal_consumption,
      'Variance': r.variance,
      'Remark': r.remark,
      'Remark 2': r.remark2,
    }));
    exportToExcel(data, `report_${filters.reportDate}.xlsx`, 'Report');
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button onClick={handleDownload}>
            <Download size={16} />
            Download Report
          </Button>
        }
      />

      <ReportFilters
        filters={filters}
        onChange={setFilters}
        outlets={outletOptions}
        managers={managerOptions}
        categories={categoryOptions}
        items={itemOptions}
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Area Manager</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Outlet Name</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Item</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">UOM</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Day-1 Closing</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Day-1 Purchase</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Day Closing</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Actual Consumption</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Ideal Consumption</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Variance</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Remark</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Remark 2</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithRemarks.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                  No data for this date/filter combination.
                </td>
              </tr>
            ) : (
              <>
                {rowsWithRemarks.map((r) => (
                  <tr key={rowKey(r)} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.area_manager || '-'}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{r.outlet}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.item}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.uom || '-'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.opening}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.purchase}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.closing}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.actual_consumption}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.ideal_consumption}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.variance < 0 ? 'text-red-600' : r.variance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {r.variance}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-32 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={r.remark}
                        onChange={(e) => updateRemark(r, 'remark', e.target.value)}
                        placeholder="Remark"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-32 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={r.remark2}
                        onChange={(e) => updateRemark(r, 'remark2', e.target.value)}
                        placeholder="Remark 2"
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-300">
                  <td className="px-3 py-3 text-slate-700" colSpan={4}>Total</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.opening}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.purchase}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.closing}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.actual_consumption}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.ideal_consumption}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.variance}</td>
                  <td colSpan={2}></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-slate-400 text-xs mt-3">
        Note: Remark / Remark 2 are typed in directly on this screen and are included in the downloaded report,
        but are not saved permanently yet — they reset if you change the date/filters or reload the page.
      </p>
    </div>
  );
}
