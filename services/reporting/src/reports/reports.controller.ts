import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  revenue() {
    return this.reports.revenue();
  }

  @Get('sales-summary')
  salesSummary() {
    return this.reports.salesSummary();
  }
}
