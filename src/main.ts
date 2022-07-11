import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { AppModule } from './app.module';
import {NestExpressApplication} from '@nestjs/platform-express';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	app.useStaticAssets(join(__dirname, '..', 'public'));
	await app.listen(3003);
}
bootstrap();

/*type A = 'a' | 'b'
type B = A | 'c'

abstract class Class<R extends string> {
	_x: R
}
class ClassB extends Class<B>{

}
const b = new ClassB();
b._x = '123';
console.log(b._x === '123');*/