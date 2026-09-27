import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminTabType } from '../components/layout/Sidebar';
import { StatsOverview } from '../components/StatsOverview';
import { PickupsManager } from '../components/PickupsManager';
import { UsersManager } from '../components/UsersManager';
import { PricingManager } from '../components/PricingManager';
import { ZonesManager } from '../components/ZonesManager';
import { DatabaseInspector } from '../components/DatabaseInspector';
import { GenericTableManager } from '../components/GenericTableManager';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>('dashboard');

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout}>
      {activeTab === 'dashboard' && <StatsOverview />}
      {activeTab === 'users' && <UsersManager />}
      {activeTab === 'subscriptions' && (
        <GenericTableManager title="Subscriptions" tableName="lce_user_subscriptions" />
      )}
      {activeTab === 'plans' && (
        <GenericTableManager title="Plans" tableName="lce_subscription_plans" />
      )}
      {activeTab === 'orders' && <PickupsManager />}
      {activeTab === 'invoices' && (
        <GenericTableManager title="Invoices" tableName="lce_user_invoice" />
      )}
      {activeTab === 'transactions' && (
        <GenericTableManager title="Transactions" tableName="lce_user_transactions" />
      )}
      {activeTab === 'promo-codes' && (
        <GenericTableManager title="Promo Codes" tableName="lce_promo_codes" />
      )}
      {activeTab === 'zones' && <ZonesManager />}
      {activeTab === 'non-working-days' && (
        <GenericTableManager title="Non-Working Days" tableName="lce_non_working_days" />
      )}
      {activeTab === 'pricing' && <PricingManager />}
      {activeTab === 'sql-tool' && <DatabaseInspector />}
    </AdminLayout>
  );
};
