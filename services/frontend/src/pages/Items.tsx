import { FormEvent, useEffect, useState } from 'react';
import { api, formatCents, Item } from '../api';

export function Items() {
  const [rows, setRows] = useState<Item[]>([]);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await api.items());
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(price || '0') * 100);
    if (!sku.trim() || !name.trim() || Number.isNaN(priceCents)) return;
    setSaving(true);
    try {
      await api.createItem({ sku: sku.trim(), name: name.trim(), priceCents });
      setSku('');
      setName('');
      setPrice('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="card-head">
          <h2>Items</h2>
          <span className="count">{rows.length}</span>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th className="right">Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className="mono">{i.sku}</td>
                  <td>{i.name}</td>
                  <td className="right">{formatCents(i.priceCents)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">No items yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>New item</h2>
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-5001" />
          </label>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Deluxe Widget" />
          </label>
          <label>
            Price (USD)
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="49.99" inputMode="decimal" />
          </label>
          <button className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Add item'}
          </button>
        </form>
      </div>
    </div>
  );
}
