import { Module } from '@nestjs/common';
import { SpyService } from './spy.service';
import { SpyGateway } from './spy.gateway';

@Module({
	providers: [SpyGateway, SpyService]
})
export class SpyModule {}
