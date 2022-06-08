import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpyModule } from './spy/spy.module';

@Module({
	imports: [SpyModule],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
