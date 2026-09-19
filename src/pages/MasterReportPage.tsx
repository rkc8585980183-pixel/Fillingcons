import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { useSales, usePurchases, useClosingStock, useOutlets, useAreaManagers, useRecipeMapping } from '@/hooks/useTable';
import { buildReportRows, aggregateByOutlet, sumRows, computeRemark, computeRemark2 } from '@/lib/report';
import { exportToExcel } from '@/lib/excel';
import type { ReportRow } from '@/types';
import { Download } from 'lucide-react';

const ALL_ITEMS = '__all__';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function remarkClass(remark: string): string {
  if (remark === 'Acceptable' || remark === 'OK') return 'text-green-700 bg-green-50';
  if (remark === 'Need Attention' || remark === 'Closing Mistake') return 'text-red-700 bg-red-50';
  return 'text-amber-700 bg-amber-50';
}

export function MasterReportPage() {
  const { rows: sales } = useSales();
  const { rows: purchases } = usePurchases();
  const { rows: closingStock } = useClosingStock();
  const { rows: outlets } = useOutlets();
  const { rows: managers } = useAreaManagers();
  const { rows: recipeMapping } = useRecipeMapping();

  const [reportDate, setReportDate] = useState(today());
  const [selectedFilling, setSelectedFilling] = useState(ALL_ITEMS);
  const [outlet, setOutlet] = useState('');
  const [areaManager, setAreaManager] = useState('');
  const [margin, setMargin] = useState(0.1);
  const [rows, setRows] = useState<ReportRow[]>([]);

  const fillingOptions = useMemo(() => {
    const set = new Set<string>();
    recipeMapping.forEach((r) => r.ingredient_name && set.add(r.ingredient_name));
    return Array.from(set).sort().map((i) => ({ value: i, label: i }));
  }, [recipeMapping]);

  const outletOptions = useMemo(() => outlets.map((o) => ({ value: o.name, label: o.name })), [outlets]);
  const managerOptions = useMemo(() => managers.map((m) => ({ value: m.name, label: m.name })), [managers]);

  useEffect(() => {
    const allIngredientRows = buildReportRows({
      reportDate,
      sales,
      purchases,
      closingStock,
      recipeMapping,
      outlets,
      filters: {
        outlet: outlet || undefined,
        area_manager: areaManager || undefined,
        item: selectedFilling === ALL_ITEMS ? undefined : selectedFilling,
      },
    });

    const finalRows = selectedFilling === ALL_ITEMS ? aggregateByOutlet(allIngredientRows) : allIngredientRows;
    setRows(finalRows);
  }, [reportDate, selectedFilling, outlet, areaManager, sales, purchases, closingStock, recipeMapping, outlets]);

  const rowsWithRemarks = rows.map((r) => ({
    ...r,
    remark: computeRemark(r.ideal_consumption, r.variance, margin),
    remark2: computeRemark2(r.ideal_consumption, r.actual_consumption),
  }));

  const totals = sumRows(rowsWithRemarks);

  const handleDownload = () => {
    const data = rowsWithRemarks.map((r) => ({
      'Area Manager': r.area_manager,
      'Outlet Name': r.outlet,
      'UOM': r.uom,
      'Day-1 Closing Stock (Opening)': r.opening,
      'Day-1 Purchase': r.purchase,
      'Day Closing Stock': r.closing,
      'Actual Consumption': r.actual_consumption,
      'Ideal Consumption (as per sale)': r.ideal_consumption,
      'Variance': r.variance,
      'Expected Closing (kg)': r.expected_closing,
      'Remark': r.remark,
      'Remark 2': r.remark2,
    }));
    const label = selectedFilling === ALL_ITEMS ? 'all_items' : selectedFilling.replace(/[^a-z0-9]/gi, '_');
    exportToExcel(data, `master_report_${label}_${reportDate}.xlsx`, 'Master Report');
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <PageHeader
        title="Master Report"
        subtitle="Pick one filling to see it alone, or 'All Items' to see every outlet's combined totals across all fillings."
        actions={
          <Button onClick={handleDownload}>
            <Download size={16} />
            Download Report
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input label="Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          <Select
            label="Filling"
            value={selectedFilling}
            onChange={(e) => setSelectedFilling(e.target.value)}
            options={[{ value: ALL_ITEMS, label: 'All Items (Combined)' }, ...fillingOptions]}
          />
          <Select label="Outlet" value={outlet} onChange={(e) => setOutlet(e.target.value)} options={outletOptions} placeholder="All Outlets" />
          <Select label="Area Manager" value={areaManager} onChange={(e) => setAreaManager(e.target.value)} options={managerOptions} placeholder="All Managers" />
          <Input label="Margin" type="number" step="0.01" value={margin} onChange={(e) => setMargin(parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Area Manager</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Outlet Name</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">UOM</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Day-1 Closing</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Day-1 Purchase</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Day Closing</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Actual Consumption</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Ideal Consumption</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Variance</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Expected Closing (kg)</th>
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
                  <tr key={r.outlet} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.area_manager || '-'}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{r.outlet}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.uom || '-'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.opening}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.purchase}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.closing}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.actual_consumption}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.ideal_consumption}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.variance < 0 ? 'text-red-600' : r.variance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {r.variance}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.expected_closing}</td>
                    <td className="px-2 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${remarkClass(r.remark)}`}>{r.remark}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${remarkClass(r.remark2)}`}>{r.remark2}</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-300">
                  <td className="px-3 py-3 text-slate-700" colSpan={3}>Total</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.opening}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.purchase}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.closing}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.actual_consumption}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.ideal_consumption}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.variance}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{totals.expected_closing}</td>
                  <td colSpan={2}></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
