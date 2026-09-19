import { type ReactNode } from 'react';
import { Upload, Map, ClipboardList, FileBarChart, Package, ShoppingCart, TrendingDown, BarChart3, LayoutDashboard, Scale, Layers } from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'sales-upload'
  | 'purchase-upload'
  | 'closing-upload'
  | 'outlet-mapping'
  | 'item-mapping'
  | 'manager-mapping'
  | 'weight-mapping'
  | 'recipe-master'
  | 'recipe-mapping'
  | 'report-daily'
  | 'report-outlet'
  | 'report-item'
  | 'report-manager'
  | 'report-variance';

interface NavItem {
  id: PageId;
  label: string;
  icon: ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    title: 'Data Upload',
    items: [
      { id: 'sales-upload', label: 'Sales Upload', icon: <ShoppingCart size={18} /> },
      { id: 'purchase-upload', label: 'Purchase Upload', icon: <Package size={18} /> },
      { id: 'closing-upload', label: 'Closing Stock Upload', icon: <Upload size={18} /> },
    ],
  },
  {
    title: 'Mapping Panels',
    items: [
      { id: 'outlet-mapping', label: 'Outlet Mapping', icon: <Map size={18} /> },
      { id: 'item-mapping', label: 'Item Mapping', icon: <ClipboardList size={18} /> },
      { id: 'manager-mapping', label: 'Area Manager Mapping', icon: <Map size={18} /> },
      { id: 'weight-mapping', label: 'Weight Mapping', icon: <Scale size={18} /> },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { id: 'recipe-mapping', label: 'Filling / Recipe Mapping', icon: <Layers size={18} /> },
      { id: 'recipe-master', label: 'Recipe Master (legacy)', icon: <FileBarChart size={18} /> },
    ],
  },
  {
    title: 'Reports',
    items: [
      { id: 'report-daily', label: 'Daily Report', icon: <BarChart3 size={18} /> },
      { id: 'report-outlet', label: 'Outlet-wise Report', icon: <BarChart3 size={18} /> },
      { id: 'report-item', label: 'Item-wise Report', icon: <BarChart3 size={18} /> },
      { id: 'report-manager', label: 'Manager-wise Report', icon: <BarChart3 size={18} /> },
      { id: 'report-variance', label: 'Variance Report', icon: <TrendingDown size={18} /> },
    ],
  },
];

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 flex flex-col overflow-hidden border-r border-slate-800">
        <div className="px-5 py-5 border-b border-slate-800">
          <h1 className="text-white font-semibold text-lg tracking-tight">Consumption & Variance</h1>
          <p className="text-slate-400 text-xs mt-0.5">Report Module</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-5 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                {section.title}
              </p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-2 text-sm transition-colors ${
                    currentPage === item.id
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
