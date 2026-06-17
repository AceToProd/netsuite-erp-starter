// All calls go through the reporting gateway. In dev, Vite proxies /api ->
// VITE_API_TARGET (reporting on :3000). In other deployments set VITE_API_BASE
// to an absolute gateway origin at build time.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

export interface Customer {
  id: number;
  name: string;
  email?: string;
  createdAt?: string;
}

export interface Item {
  id: number;
  sku: string;
  name: string;
  priceCents: number;
  createdAt?: string;
}

export interface SalesOrder {
  id: number;
  customerId: number;
  status: string;
  totalCents: number;
  createdAt?: string;
}

export interface OrderLineInput {
  itemId: number;
  quantity: number;
}

export interface SalesSummary {
  byCustomer: Array<{ customerId: number; customerName: string; orders: number; totalCents: number }>;
  byItem: Array<{ itemId: number; sku: string; name: string; quantitySold: number; revenueCents: number }>;
  orderCount: number;
  cached: boolean;
  generatedAt: string;
}

export interface RevenueReport {
  postedOrders: number;
  revenueCents: number;
  currency: string;
  cached: boolean;
  generatedAt: string;
}

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data && typeof data === 'object' && 'message' in data ? (data as { message: string }).message : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  customers: () => http<Customer[]>('GET', '/api/customers'),
  createCustomer: (input: { name: string; email?: string }) => http<Customer>('POST', '/api/customers', input),
  items: () => http<Item[]>('GET', '/api/items'),
  createItem: (input: { sku: string; name: string; priceCents: number }) => http<Item>('POST', '/api/items', input),
  salesOrders: () => http<SalesOrder[]>('GET', '/api/sales-orders'),
  createOrder: (input: { customerId: number; lines: OrderLineInput[] }) => http<SalesOrder>('POST', '/api/sales-orders', input),
  salesSummary: () => http<SalesSummary>('GET', '/api/reports/sales-summary'),
  revenue: () => http<RevenueReport>('GET', '/api/reports/revenue'),
};

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}
