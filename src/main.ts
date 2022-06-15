import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { AppModule } from './app.module';
import {NestExpressApplication} from '@nestjs/platform-express';

export let appUrl: string;

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	app.useStaticAssets(join(__dirname, '..', 'public'));
	await app.listen(3003);
	appUrl = await app.getUrl();
}
bootstrap();
