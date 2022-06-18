import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpyModule } from './spy/spy.module';

@Module({
	imports: [SpyModule, ScheduleModule.forRoot()],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
