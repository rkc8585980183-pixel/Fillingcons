import { type ReactNode } from 'react';
import { Calendar, Store, User, Tag, Package } from 'lucide-react';
import { Select } from '@/components/Input';

export interface ReportFilterValues {
  reportDate: string;
  outlet?: string;
  area_manager?: string;
  category?: string;
  item?: string;
}

interface ReportFiltersProps {
  filters: ReportFilterValues;
  onChange: (filters: ReportFilterValues) => void;
  outlets: { value: string; label: string }[];
  managers: { value: string; label: string }[];
  categories: { value: string; label: string }[];
  items: { value: string; label: string }[];
  children?: ReactNode;
}

export function ReportFilters({
  filters, onChange, outlets, managers, categories, items, children,
}: ReportFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1">
            <Calendar size={14} />
            Report Date
          </label>
          <input
            type="date"
            value={filters.reportDate}
            onChange={(e) => onChange({ ...filters, reportDate: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Select
          label="Outlet"
          value={filters.outlet || ''}
          onChange={(e) => onChange({ ...filters, outlet: e.target.value })}
          options={outlets}
          placeholder="All Outlets"
        />
        <Select
          label="Area Manager"
          value={filters.area_manager || ''}
          onChange={(e) => onChange({ ...filters, area_manager: e.target.value })}
          options={managers}
          placeholder="All Managers"
        />
        <Select
          label="Category"
          value={filters.category || ''}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          options={categories}
          placeholder="All Categories"
        />
        <Select
          label="Item"
          value={filters.item || ''}
          onChange={(e) => onChange({ ...filters, item: e.target.value })}
          options={items}
          placeholder="All Items"
        />
        {children}
      </div>
    </div>
  );
}
