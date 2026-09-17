import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardBody } from '@/components/Card';
import { ShoppingCart, Package, Upload, FileBarChart, TrendingDown, Map, ClipboardList, Scale } from 'lucide-react';
import type { PageId } from '@/components/Layout';

interface DashboardProps {
  onNavigate: (page: PageId) => void;
}

interface CountResult { count: number }

export function DashboardPage({ onNavigate }: DashboardProps) {
  const [counts, setCounts] = useState({
    sales: 0,
    purchases: 0,
    closing: 0,
    outlets: 0,
    items: 0,
    managers: 0,
    weights: 0,
    recipes: 0,
  });

  useEffect(() => {
    (async () => {
      const tables = ['sales', 'purchases', 'closing_stock', 'outlets', 'items', 'area_managers', 'weights', 'recipes'];
      const results = await Promise.all(
        tables.map((t) => supabase.from(t).select('*', { count: 'exact', head: true }))
      );
      setCounts({
        sales: (results[0].count as number) || 0,
        purchases: (results[1].count as number) || 0,
        closing: (results[2].count as number) || 0,
        outlets: (results[3].count as number) || 0,
        items: (results[4].count as number) || 0,
        managers: (results[5].count as number) || 0,
        weights: (results[6].count as number) || 0,
        recipes: (results[7].count as number) || 0,
      });
    })();
  }, []);

  const cards = [
    { label: 'Sales Records', value: counts.sales, icon: <ShoppingCart size={20} />, page: 'sales-upload' as PageId, color: 'bg-blue-50 text-blue-600' },
    { label: 'Purchase Records', value: counts.purchases, icon: <Package size={20} />, page: 'purchase-upload' as PageId, color: 'bg-green-50 text-green-600' },
    { label: 'Closing Stock', value: counts.closing, icon: <Upload size={20} />, page: 'closing-upload' as PageId, color: 'bg-amber-50 text-amber-600' },
    { label: 'Recipes', value: counts.recipes, icon: <FileBarChart size={20} />, page: 'recipe-master' as PageId, color: 'bg-purple-50 text-purple-600' },
    { label: 'Outlets', value: counts.outlets, icon: <Map size={20} />, page: 'outlet-mapping' as PageId, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Items', value: counts.items, icon: <ClipboardList size={20} />, page: 'item-mapping' as PageId, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Area Managers', value: counts.managers, icon: <Map size={20} />, page: 'manager-mapping' as PageId, color: 'bg-rose-50 text-rose-600' },
    { label: 'Weight Units', value: counts.weights, icon: <Scale size={20} />, page: 'weight-mapping' as PageId, color: 'bg-slate-50 text-slate-600' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h2>
      <p className="text-slate-500 text-sm mb-6">Overview of your Consumption & Variance Report data</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => onNavigate(card.page)}
            className="text-left"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardBody>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                  {card.icon}
                </div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </CardBody>
            </Card>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('report-daily')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <FileBarChart size={16} />
            View Daily Report
          </button>
          <button
            onClick={() => onNavigate('report-variance')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <TrendingDown size={16} />
            View Variance Report
          </button>
          <button
            onClick={() => onNavigate('sales-upload')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors border border-slate-300"
          >
            <ShoppingCart size={16} />
            Upload Sales
          </button>
          <button
            onClick={() => onNavigate('purchase-upload')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors border border-slate-300"
          >
            <Package size={16} />
            Upload Purchases
          </button>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
        <h3 className="font-semibold text-blue-900 mb-2">How the Report Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Opening</strong> = Previous day's closing stock</li>
          <li><strong>Purchase</strong> = Previous day's purchase</li>
          <li><strong>Sales</strong> = Previous day's sales</li>
          <li><strong>Closing</strong> = Selected date's closing stock</li>
          <li><strong>Actual Consumption</strong> = Opening + Purchase - Closing</li>
          <li><strong>Ideal Consumption</strong> = Sales Qty x Recipe Filled Qty (Gram) / 1000</li>
          <li><strong>Variance</strong> = Actual Consumption - Ideal Consumption</li>
          <li><strong>Ideal Closing</strong> = Opening + Purchase - Ideal Consumption</li>
        </ul>
      </div>
    </div>
  );
}
