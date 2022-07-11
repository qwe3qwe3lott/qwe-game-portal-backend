import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway} from '@nestjs/websockets';
import {YesntService} from './yesnt.service';
import {GameGateway} from '../abstracts/game-gateway.abstract';
import {RoomOptions} from './types/room-options.type';
import {RoomStatus} from './types/room-status.type';
import {SocketWithData} from '../types/socket-with-data.type';
import {Events} from './enums/events.enum';
import {Answers} from './enums/answers.enum';

@WebSocketGateway({
	namespace: 'yesnt',
	cors: { origin: '*' }
})
export class YesntGateway extends GameGateway<YesntService, RoomOptions, RoomStatus> {
	constructor(protected readonly _service: YesntService) { super(_service); }

	@SubscribeMessage(Events.ASK)
	public ask(@MessageBody() question: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!question) return;
		this._service.ask(question, socket.data);
	}

	@SubscribeMessage(Events.SKIP_ASK)
	public skipAsk(@ConnectedSocket() socket: SocketWithData): void {
		this._service.skipAsk(socket.data);
	}

	@SubscribeMessage(Events.ANSWER)
	public answer(@MessageBody() answer: Answers, @ConnectedSocket() socket: SocketWithData): void {
		if (!answer) return;
		this._service.answer(answer, socket.data);
	}
}
