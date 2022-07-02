import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway} from '@nestjs/websockets';
import {SpyService} from './spy.service';
import {Events} from './enums/events.enum';
import {SocketWithData} from '../types/socket-with-data.type';
import {MovementDto} from './dto/movement.dto';
import {OptionsDto} from './dto/options.dto';
import {OptionsOfCardsDto} from './dto/options-of-cards.dto';
import {GameGateway} from '../abstracts/game-gateway.abstract';

@WebSocketGateway({
	namespace: 'spy',
	cors: { origin: '*' }
})
export class SpyGateway extends GameGateway<SpyService> {
	constructor(protected readonly _service: SpyService) { super(_service); }

	@SubscribeMessage(Events.MOVE_CARDS)
	moveCards(@MessageBody() movement: MovementDto, @ConnectedSocket() socket: SocketWithData): void {
		if (!movement) return;
		return this._service.moveCards(movement, socket.data);
	}

	@SubscribeMessage(Events.CAPTURE_CARD)
	captureCard(@MessageBody() cardId: number, @ConnectedSocket() socket: SocketWithData): void {
		if (cardId === undefined) return;
		return this._service.captureCard(cardId, socket.data);
	}

	@SubscribeMessage(Events.ASK_CARD)
	askCard(@MessageBody() cardId: number, @ConnectedSocket() socket: SocketWithData): void {
		if (cardId === undefined) return;
		return this._service.askCard(cardId, socket.data);
	}

	@SubscribeMessage(Events.CHANGE_ROOM_OPTIONS)
	changeRoomOptions(@MessageBody() optionsDto: OptionsDto, @ConnectedSocket() socket: SocketWithData): boolean {
		if (!optionsDto) return false;
		return this._service.changeRoomOptions(optionsDto, socket.data);
	}

	@SubscribeMessage(Events.CHANGE_ROOM_OPTIONS_OF_CARDS)
	changeRoomOptionsOfCards(@MessageBody() optionsOfCardsDto: OptionsOfCardsDto, @ConnectedSocket() socket: SocketWithData): boolean {
		if (!optionsOfCardsDto) return false;
		return this._service.changeRoomOptionsOfCards(optionsOfCardsDto, socket.data);
	}

	@SubscribeMessage(Events.REQUEST_ROOM_OPTIONS)
	requestRoomOptions(@ConnectedSocket() socket: SocketWithData): void {
		return this._service.requestRoomOptions(socket.data);
	}

	@SubscribeMessage(Events.REQUEST_ROOM_OPTIONS_OF_CARDS)
	requestRoomOptionsOfCards(@ConnectedSocket() socket: SocketWithData): void {
		return this._service.requestRoomOptionsOfCards(socket.data);
	}
}
