import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ErpController } from './erp/erp.controller';
import { ErpService } from './erp/erp.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { CacheService } from './cache/cache.service';

@Module({
  controllers: [HealthController, ErpController, ReportsController],
  providers: [ErpService, ReportsService, CacheService],
})
export class AppModule {}
