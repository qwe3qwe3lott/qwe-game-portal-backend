import { Module } from '@nestjs/common';
import { YesntService } from './yesnt.service';
import { YesntGateway } from './yesnt.gateway';

@Module({
	providers: [YesntGateway, YesntService]
})
export class YesntModule {}
