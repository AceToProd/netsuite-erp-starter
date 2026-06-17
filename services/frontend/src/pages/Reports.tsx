import { useEffect, useState } from 'react';
import { api, formatCents, RevenueReport, SalesSummary } from '../api';

export function Reports() {
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([api.revenue(), api.salesSummary()]);
      setRevenue(r);
      setSummary(s);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="reports">
      <div className="toolbar">
        <button className="btn-ghost" onClick={() => void load()} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
        {summary && <span className="muted small">cache: {summary.cached ? 'hit' : 'fresh'}</span>}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">Revenue (posted)</div>
          <div className="stat-value">{revenue ? formatCents(revenue.revenueCents) : '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Posted orders</div>
          <div className="stat-value">{revenue?.postedOrders ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Customers with orders</div>
          <div className="stat-value">{summary?.byCustomer.length ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Items sold</div>
          <div className="stat-value">{summary?.byItem.length ?? '—'}</div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="card-head"><h2>Revenue by customer</h2></div>
          <table className="table">
            <thead>
              <tr><th>Customer</th><th className="right">Orders</th><th className="right">Total</th></tr>
            </thead>
            <tbody>
              {summary?.byCustomer.map((c) => (
                <tr key={c.customerId}>
                  <td>{c.customerName}</td>
                  <td className="right">{c.orders}</td>
                  <td className="right">{formatCents(c.totalCents)}</td>
                </tr>
              ))}
              {(!summary || summary.byCustomer.length === 0) && (
                <tr><td colSpan={3} className="muted">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head"><h2>Top items</h2></div>
          <table className="table">
            <thead>
              <tr><th>Item</th><th className="right">Qty</th><th className="right">Revenue</th></tr>
            </thead>
            <tbody>
              {summary?.byItem.map((i) => (
                <tr key={i.itemId}>
                  <td>{i.name} <span className="mono muted">{i.sku}</span></td>
                  <td className="right">{i.quantitySold}</td>
                  <td className="right">{formatCents(i.revenueCents)}</td>
                </tr>
              ))}
              {(!summary || summary.byItem.length === 0) && (
                <tr><td colSpan={3} className="muted">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
