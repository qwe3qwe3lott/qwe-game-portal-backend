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
	private readonly QUESTION_MAX_LENGTH = 100;
	constructor(protected readonly _service: YesntService) { super(_service); }

	@SubscribeMessage(Events.ASK)
	public ask(@MessageBody() question: string, @ConnectedSocket() socket: SocketWithData): void {
		if (typeof question !== 'string' || !question) return;
		if (question.length > this.QUESTION_MAX_LENGTH) question = question.substring(0, this.QUESTION_MAX_LENGTH);
		this._service.ask(question, socket.data);
	}

	@SubscribeMessage(Events.SKIP_ASK)
	public skipAsk(@ConnectedSocket() socket: SocketWithData): void {
		this._service.skipAsk(socket.data);
	}

	@SubscribeMessage(Events.ANSWER)
	public answer(@MessageBody() answer: Answers, @ConnectedSocket() socket: SocketWithData): void {
		if (typeof answer !== 'string' || !answer) return;
		this._service.answer(answer, socket.data);
	}
}
