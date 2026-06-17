import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { ErpService } from '../erp/erp.service';

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

const TTL_SECONDS = 30;

@Injectable()
export class ReportsService {
  constructor(
    private readonly erp: ErpService,
    private readonly cache: CacheService,
  ) {}

  async revenue(): Promise<RevenueReport> {
    const cacheKey = 'report:revenue';
    const cached = await this.cache.get<RevenueReport>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const orders = await this.erp.salesOrders();
    const posted = orders.filter((o) => (o.status || '').toUpperCase() === 'POSTED');
    const revenueCents = posted.reduce((sum, o) => sum + (o.totalCents || 0), 0);

    const report: RevenueReport = {
      postedOrders: posted.length,
      revenueCents,
      currency: 'USD',
      cached: false,
      generatedAt: new Date().toISOString(),
    };
    await this.cache.set(cacheKey, report, TTL_SECONDS);
    return report;
  }

  async salesSummary(): Promise<SalesSummary> {
    const cacheKey = 'report:sales-summary';
    const cached = await this.cache.get<SalesSummary>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const [customers, items, orders] = await Promise.all([
      this.erp.customers(),
      this.erp.items(),
      this.erp.salesOrders(),
    ]);

    const customerName = new Map(customers.map((c) => [c.id, c.name]));
    const itemById = new Map(items.map((i) => [i.id, i]));

    const byCustomer = new Map<number, { customerId: number; customerName: string; orders: number; totalCents: number }>();
    const byItem = new Map<number, { itemId: number; sku: string; name: string; quantitySold: number; revenueCents: number }>();

    // Fetch each order's detail (lines) to aggregate per item.
    const details = await Promise.all(orders.map((o) => this.erp.order(o.id)));

    for (const order of details) {
      const cust = byCustomer.get(order.customerId) ?? {
        customerId: order.customerId,
        customerName: customerName.get(order.customerId) ?? `Customer #${order.customerId}`,
        orders: 0,
        totalCents: 0,
      };
      cust.orders += 1;
      cust.totalCents += order.totalCents || 0;
      byCustomer.set(order.customerId, cust);

      for (const line of order.lines || []) {
        const item = itemById.get(line.itemId);
        const agg = byItem.get(line.itemId) ?? {
          itemId: line.itemId,
          sku: item?.sku ?? `#${line.itemId}`,
          name: item?.name ?? `Item #${line.itemId}`,
          quantitySold: 0,
          revenueCents: 0,
        };
        agg.quantitySold += line.quantity;
        agg.revenueCents += line.quantity * line.unitPriceCents;
        byItem.set(line.itemId, agg);
      }
    }

    const summary: SalesSummary = {
      byCustomer: [...byCustomer.values()].sort((a, b) => b.totalCents - a.totalCents),
      byItem: [...byItem.values()].sort((a, b) => b.revenueCents - a.revenueCents),
      orderCount: orders.length,
      cached: false,
      generatedAt: new Date().toISOString(),
    };
    await this.cache.set(cacheKey, summary, TTL_SECONDS);
    return summary;
  }
}
