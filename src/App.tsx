import { useState } from 'react';
import { Layout, type PageId } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { SalesUploadPage } from '@/pages/SalesUploadPage';
import { PurchaseUploadPage } from '@/pages/PurchaseUploadPage';
import { ClosingUploadPage } from '@/pages/ClosingUploadPage';
import { OutletMappingPage } from '@/pages/OutletMappingPage';
import { ItemMappingPage } from '@/pages/ItemMappingPage';
import { ManagerMappingPage } from '@/pages/ManagerMappingPage';
import { WeightMappingPage } from '@/pages/WeightMappingPage';
import { RecipeMasterPage } from '@/pages/RecipeMasterPage';
import { ReportPage } from '@/pages/ReportPage';

function App() {
  const [page, setPage] = useState<PageId>('dashboard');

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage onNavigate={setPage} />;
      case 'sales-upload':
        return <SalesUploadPage />;
      case 'purchase-upload':
        return <PurchaseUploadPage />;
      case 'closing-upload':
        return <ClosingUploadPage />;
      case 'outlet-mapping':
        return <OutletMappingPage />;
      case 'item-mapping':
        return <ItemMappingPage />;
      case 'manager-mapping':
        return <ManagerMappingPage />;
      case 'weight-mapping':
        return <WeightMappingPage />;
      case 'recipe-master':
        return <RecipeMasterPage />;
      case 'report-daily':
        return <ReportPage reportType="daily" title="Daily Report" subtitle="Day-by-day consumption and variance breakdown" />;
      case 'report-outlet':
        return <ReportPage reportType="outlet" title="Outlet-wise Report" subtitle="Consumption and variance grouped by outlet" />;
      case 'report-item':
        return <ReportPage reportType="item" title="Item-wise Report" subtitle="Consumption and variance grouped by item" />;
      case 'report-manager':
        return <ReportPage reportType="manager" title="Manager-wise Report" subtitle="Consumption and variance grouped by area manager" />;
      case 'report-variance':
        return <ReportPage reportType="variance" title="Variance Report" subtitle="Actual vs ideal consumption and closing variance" />;
      default:
        return <DashboardPage onNavigate={setPage} />;
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
