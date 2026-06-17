import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ErpService } from './erp.service';

/**
 * Passthrough proxies to erp-core so the SPA only ever talks to one base URL
 * (the reporting gateway). These mirror the erp-core CRUD endpoints.
 */
@Controller('api')
export class ErpController {
  constructor(private readonly erp: ErpService) {}

  @Get('customers')
  customers() {
    return this.erp.customers();
  }

  @Post('customers')
  createCustomer(@Body() body: unknown) {
    return this.erp.request('POST', '/api/customers', body);
  }

  @Get('items')
  items() {
    return this.erp.items();
  }

  @Post('items')
  createItem(@Body() body: unknown) {
    return this.erp.request('POST', '/api/items', body);
  }

  @Get('sales-orders')
  salesOrders() {
    return this.erp.salesOrders();
  }

  @Get('sales-orders/:id')
  order(@Param('id') id: string) {
    return this.erp.order(id);
  }

  @Post('sales-orders')
  createOrder(@Body() body: unknown) {
    return this.erp.request('POST', '/api/sales-orders', body);
  }

  // --- Accounts Payable (Release 2+) ---------------------------------------

  @Get('vendors')
  vendors() {
    return this.erp.request('GET', '/api/vendors');
  }

  @Post('vendors')
  createVendor(@Body() body: unknown) {
    return this.erp.request('POST', '/api/vendors', body);
  }

  @Get('purchase-orders')
  purchaseOrders() {
    return this.erp.request('GET', '/api/purchase-orders');
  }

  @Get('purchase-orders/summary/open-payables')
  openPayables() {
    return this.erp.request('GET', '/api/purchase-orders/summary/open-payables');
  }

  @Get('purchase-orders/:id')
  purchaseOrder(@Param('id') id: string) {
    return this.erp.request('GET', `/api/purchase-orders/${id}`);
  }

  @Post('purchase-orders')
  createPurchaseOrder(@Body() body: unknown) {
    return this.erp.request('POST', '/api/purchase-orders', body);
  }
}
