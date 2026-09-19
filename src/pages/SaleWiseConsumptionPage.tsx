import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { useSales, useOutlets, useRecipeMapping } from '@/hooks/useTable';
import { buildSaleWiseIdealConsumption, type SaleWiseRow } from '@/lib/report';
import { exportToExcel } from '@/lib/excel';
import { Download } from 'lucide-react';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function SaleWiseConsumptionPage() {
  const { rows: sales } = useSales();
  const { rows: outlets } = useOutlets();
  const { rows: recipeMapping } = useRecipeMapping();

  const [saleDate, setSaleDate] = useState(today());
  const [outlet, setOutlet] = useState('');
  const [rows, setRows] = useState<SaleWiseRow[]>([]);

  const outletOptions = useMemo(() => outlets.map((o) => ({ value: o.name, label: o.name })), [outlets]);

  useEffect(() => {
    const built = buildSaleWiseIdealConsumption(saleDate, sales, recipeMapping);
    setRows(outlet ? built.filter((r) => r.outlet.toLowerCase() === outlet.toLowerCase()) : built);
  }, [saleDate, outlet, sales, recipeMapping]);

  const totalIdeal = rows.reduce((s, r) => s + r.ideal_consumption, 0);

  const handleDownload = () => {
    const data = rows.map((r) => ({
      'Outlet': r.outlet,
      'Sale Item': r.sale_item,
      'Category': r.category,
      'Sale Qty': r.sale_qty,
      'Ideal Consumption (kg)': r.ideal_consumption,
    }));
    exportToExcel(data, `sale_wise_ideal_consumption_${saleDate}.xlsx`, 'Sale-wise Ideal Consumption');
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <PageHeader
        title="Ideal Consumption (as per Sale)"
        subtitle="Outlet-wise breakdown of what each sale item implies for filling consumption, on the sale date itself."
        actions={
          <Button onClick={handleDownload}>
            <Download size={16} />
            Download Report
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Sale Date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          <Select label="Outlet" value={outlet} onChange={(e) => setOutlet(e.target.value)} options={outletOptions} placeholder="All Outlets" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Outlet</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Sale Item</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Sale Qty</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Ideal Consumption (kg)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No sales found for this date/outlet.
                </td>
              </tr>
            ) : (
              <>
                {rows.map((r) => (
                  <tr key={`${r.outlet}-${r.sale_item}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{r.outlet}</td>
                    <td className="px-4 py-2.5 text-slate-700">{r.sale_item}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.category || '-'}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{r.sale_qty}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{r.ideal_consumption}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-300">
                  <td className="px-4 py-3 text-slate-700" colSpan={4}>Total Ideal Consumption</td>
                  <td className="px-4 py-3 text-right text-slate-800">{Math.round(totalIdeal * 10000) / 10000}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
