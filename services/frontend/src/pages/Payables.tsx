import { FormEvent, useEffect, useState } from 'react';
import { api, formatCents, PurchaseOrder, Vendor } from '../api';

export function Payables() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [openCents, setOpenCents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New vendor
  const [vName, setVName] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vTerms, setVTerms] = useState('Net 30');

  // New PO
  const [poVendorId, setPoVendorId] = useState<number | ''>('');
  const [poDesc, setPoDesc] = useState('');
  const [poQty, setPoQty] = useState(1);
  const [poUnit, setPoUnit] = useState(0);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [v, o, p] = await Promise.all([api.vendors(), api.purchaseOrders(), api.openPayables()]);
      setVendors(v);
      setOrders(o);
      setOpenCents(p.openPayableCents);
      setError(null);
      if (poVendorId === '' && v.length) setPoVendorId(v[0].id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addVendor(e: FormEvent) {
    e.preventDefault();
    if (!vName.trim()) return;
    setSaving(true);
    try {
      await api.createVendor({ name: vName.trim(), email: vEmail.trim() || undefined, terms: vTerms.trim() || undefined });
      setVName('');
      setVEmail('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function addPo(e: FormEvent) {
    e.preventDefault();
    if (poVendorId === '' || !poDesc.trim()) return;
    setSaving(true);
    try {
      await api.createPurchaseOrder({
        vendorId: Number(poVendorId),
        lines: [{ description: poDesc.trim(), quantity: poQty, unitCostCents: poUnit }],
      });
      setPoDesc('');
      setPoQty(1);
      setPoUnit(0);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));

  return (
    <div className="grid">
      <div className="card">
        <div className="card-head">
          <h2>Open payables</h2>
          <span className="count">{formatCents(openCents)}</span>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>PO</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">#{o.id}</td>
                  <td>{vendorName.get(o.vendorId) || o.vendorId}</td>
                  <td>{o.status}</td>
                  <td>{formatCents(o.totalCents)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">No purchase orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Vendors</h2>
          <span className="count">{vendors.length}</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Terms</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id}>
                <td className="mono">{v.id}</td>
                <td>{v.name}</td>
                <td className="muted">{v.terms || '—'}</td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">No vendors yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        <form className="form" onSubmit={addVendor}>
          <label>
            Vendor name
            <input value={vName} onChange={(e) => setVName(e.target.value)} placeholder="Globex Supplies" />
          </label>
          <label>
            Email
            <input value={vEmail} onChange={(e) => setVEmail(e.target.value)} placeholder="ap@globex.example" />
          </label>
          <label>
            Terms
            <input value={vTerms} onChange={(e) => setVTerms(e.target.value)} placeholder="Net 30" />
          </label>
          <button className="btn" disabled={saving || !vName.trim()}>
            {saving ? 'Saving…' : 'Add vendor'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>New purchase order</h2>
        </div>
        <form className="form" onSubmit={addPo}>
          <label>
            Vendor
            <select value={poVendorId} onChange={(e) => setPoVendorId(e.target.value ? Number(e.target.value) : '')}>
              {vendors.length === 0 && <option value="">No vendors — add one first</option>}
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label>
            Description
            <input value={poDesc} onChange={(e) => setPoDesc(e.target.value)} placeholder="Steel sheets" />
          </label>
          <label>
            Quantity
            <input type="number" min={1} value={poQty} onChange={(e) => setPoQty(Number(e.target.value))} />
          </label>
          <label>
            Unit cost (cents)
            <input type="number" min={0} value={poUnit} onChange={(e) => setPoUnit(Number(e.target.value))} />
          </label>
          <button className="btn" disabled={saving || poVendorId === '' || !poDesc.trim()}>
            {saving ? 'Saving…' : 'Create PO'}
          </button>
        </form>
      </div>
    </div>
  );
}
