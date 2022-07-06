import {WebSocketGateway} from '@nestjs/websockets';
import {YesntService} from './yesnt.service';
import {GameGateway} from '../abstracts/game-gateway.abstract';
import {RoomOptions} from './types/room-options.type';

@WebSocketGateway({
	namespace: 'yesnt',
	cors: { origin: '*' }
})
export class YesntGateway extends GameGateway<YesntService, RoomOptions> {
	constructor(protected readonly _service: YesntService) { super(_service); }
}
