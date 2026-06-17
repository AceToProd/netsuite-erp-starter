import { FormEvent, useEffect, useState } from 'react';
import { api, Customer, formatCents, Item, SalesOrder } from '../api';

interface LineDraft {
  itemId: number | '';
  quantity: number;
}

export function SalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: '', quantity: 1 }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [o, c, i] = await Promise.all([api.salesOrders(), api.customers(), api.items()]);
      setOrders(o);
      setCustomers(c);
      setItems(i);
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

  const itemPrice = (id: number | '') => items.find((i) => i.id === id)?.priceCents ?? 0;
  const estimatedTotal = lines.reduce((sum, l) => sum + itemPrice(l.itemId) * l.quantity, 0);

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const valid = lines.filter((l) => l.itemId !== '' && l.quantity > 0);
    if (customerId === '' || valid.length === 0) {
      setError('Pick a customer and at least one item line.');
      return;
    }
    setSaving(true);
    try {
      await api.createOrder({
        customerId: customerId as number,
        lines: valid.map((l) => ({ itemId: l.itemId as number, quantity: l.quantity })),
      });
      setCustomerId('');
      setLines([{ itemId: '', quantity: 1 }]);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? `#${id}`;

  return (
    <div className="grid">
      <div className="card">
        <div className="card-head">
          <h2>Sales orders</h2>
          <span className="count">{orders.length}</span>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.id}</td>
                  <td>{customerName(o.customerId)}</td>
                  <td><span className="badge">{o.status}</span></td>
                  <td className="right">{formatCents(o.totalCents)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>New sales order</h2>
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            Customer
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <div className="lines">
            <div className="lines-head">Lines</div>
            {lines.map((line, idx) => (
              <div className="line-row" key={idx}>
                <select
                  value={line.itemId}
                  onChange={(e) => updateLine(idx, { itemId: e.target.value ? Number(e.target.value) : '' })}
                >
                  <option value="">Item…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({formatCents(i.priceCents)})</option>
                  ))}
                </select>
                <input
                  className="qty"
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost add" onClick={() => setLines((prev) => [...prev, { itemId: '', quantity: 1 }])}>
              + Add line
            </button>
          </div>

          <div className="estimate">
            <span>Estimated total</span>
            <strong>{formatCents(estimatedTotal)}</strong>
          </div>

          <button className="btn" disabled={saving}>
            {saving ? 'Posting…' : 'Post order'}
          </button>
          <p className="muted small">Posting an order writes its lines and a balanced journal entry (DR Accounts Receivable / CR Sales Revenue) in erp-core.</p>
        </form>
      </div>
    </div>
  );
}
