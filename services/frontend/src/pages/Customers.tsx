import { FormEvent, useEffect, useState } from 'react';
import { api, Customer } from '../api';

export function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await api.customers());
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
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createCustomer({ name: name.trim(), email: email.trim() || undefined });
      setName('');
      setEmail('');
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
          <h2>Customers</h2>
          <span className="count">{rows.length}</span>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.id}</td>
                  <td>{c.name}</td>
                  <td className="muted">{c.email || '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">No customers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>New customer</h2>
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corporation" />
          </label>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ap@acme.example" />
          </label>
          <button className="btn" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Add customer'}
          </button>
        </form>
      </div>
    </div>
  );
}
