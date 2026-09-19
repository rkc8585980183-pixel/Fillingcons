import { useState } from 'react';
import { Layout, type PageId } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { SalesUploadPage } from '@/pages/SalesUploadPage';
import { PurchaseUploadPage } from '@/pages/PurchaseUploadPage';
import { ClosingUploadPage } from '@/pages/ClosingUploadPage';
import { OutletMappingPage } from '@/pages/OutletMappingPage';
import { ItemMappingPage } from '@/pages/ItemMappingPage';
import { ManagerMappingPage } from '@/pages/ManagerMappingPage';
import { RecipeMappingPage } from '@/pages/RecipeMappingPage';
import { ReportPage } from '@/pages/ReportPage';
import { MasterReportPage } from '@/pages/MasterReportPage';
import { SaleWiseConsumptionPage } from '@/pages/SaleWiseConsumptionPage';

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
      case 'recipe-mapping':
        return <RecipeMappingPage />;
      case 'report-daily':
        return <ReportPage reportType="daily" title="Daily Report" subtitle="Day-by-day consumption and variance breakdown" />;
      case 'report-outlet':
        return <ReportPage reportType="outlet" title="Outlet-wise Report" subtitle="Consumption and variance grouped by outlet" />;
      case 'report-item':
        return <ReportPage reportType="item" title="Item-wise Report" subtitle="Consumption and variance grouped by ingredient" />;
      case 'report-manager':
        return <ReportPage reportType="manager" title="Manager-wise Report" subtitle="Consumption and variance grouped by area manager" />;
      case 'report-variance':
        return <ReportPage reportType="variance" title="Variance Report" subtitle="Actual vs ideal consumption and closing variance" />;
      case 'report-master':
        return <MasterReportPage />;
      case 'report-sale-ideal':
        return <SaleWiseConsumptionPage />;
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
