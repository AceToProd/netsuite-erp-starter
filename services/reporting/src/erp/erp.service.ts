import { HttpException, Injectable } from '@nestjs/common';

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

export interface OrderLine {
  id: number;
  orderId: number;
  itemId: number;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderResponse extends SalesOrder {
  lines: OrderLine[];
  journalEntries: unknown[];
}

/** Thin HTTP client for the Java erp-core service. */
@Injectable()
export class ErpService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = (process.env.ERP_CORE_URL || 'http://localhost:8080').replace(/\/$/, '');
  }

  get coreUrl(): string {
    return this.baseUrl;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new HttpException(
        `erp-core unreachable at ${this.baseUrl}: ${(err as Error).message}`,
        502,
      );
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message =
        data && typeof data === 'object' && 'message' in data
          ? (data as { message: string }).message
          : `erp-core returned ${res.status}`;
      throw new HttpException(message, res.status);
    }
    return data as T;
  }

  customers(): Promise<Customer[]> {
    return this.request<Customer[]>('GET', '/api/customers');
  }

  items(): Promise<Item[]> {
    return this.request<Item[]>('GET', '/api/items');
  }

  salesOrders(): Promise<SalesOrder[]> {
    return this.request<SalesOrder[]>('GET', '/api/sales-orders');
  }

  order(id: number | string): Promise<OrderResponse> {
    return this.request<OrderResponse>('GET', `/api/sales-orders/${id}`);
  }

  async health(): Promise<{ reachable: boolean; detail?: unknown }> {
    try {
      const detail = await this.request<unknown>('GET', '/api/health');
      return { reachable: true, detail };
    } catch (err) {
      return { reachable: false, detail: (err as Error).message };
    }
  }
}
