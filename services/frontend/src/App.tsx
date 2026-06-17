import { useState } from 'react';
import { Customers } from './pages/Customers';
import { Items } from './pages/Items';
import { SalesOrders } from './pages/SalesOrders';
import { Reports } from './pages/Reports';

type Tab = 'reports' | 'customers' | 'items' | 'orders';

const NAV: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'reports', label: 'Dashboard', icon: '◈' },
  { id: 'customers', label: 'Customers', icon: '◍' },
  { id: 'items', label: 'Items', icon: '▤' },
  { id: 'orders', label: 'Sales Orders', icon: '▦' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('reports');

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">E</span>
          <div>
            <div className="brand-name">Mini-ERP</div>
            <div className="brand-sub">NetSuite-like</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? 'active' : ''}`}
              onClick={() => setTab(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>erp-core · reporting · frontend</div>
          <div className="muted">orchestrated by ace-engine</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{NAV.find((n) => n.id === tab)?.label}</h1>
          <div className="topbar-right">
            <span className="pill">via reporting gateway</span>
          </div>
        </header>
        <section className="content">
          {tab === 'reports' && <Reports />}
          {tab === 'customers' && <Customers />}
          {tab === 'items' && <Items />}
          {tab === 'orders' && <SalesOrders />}
        </section>
      </main>
    </div>
  );
}
