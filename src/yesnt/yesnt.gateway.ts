import {WebSocketGateway} from '@nestjs/websockets';
import {YesntService} from './yesnt.service';
import {GameGateway} from '../abstracts/game-gateway.abstract';

@WebSocketGateway({
	namespace: 'yesnt',
	cors: { origin: '*' }
})
export class YesntGateway extends GameGateway<YesntService> {
	constructor(protected readonly _service: YesntService) { super(_service); }
}
