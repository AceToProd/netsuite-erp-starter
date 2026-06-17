import { Controller, Get } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { ErpService } from '../erp/erp.service';

@Controller('api')
export class HealthController {
  constructor(
    private readonly erp: ErpService,
    private readonly cache: CacheService,
  ) {}

  @Get('health')
  async health() {
    const core = await this.erp.health();
    return {
      status: 'ok',
      service: 'reporting',
      cache: this.cache.backend(),
      erpCore: {
        url: this.erp.coreUrl,
        reachable: core.reachable,
      },
    };
  }
}
