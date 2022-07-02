import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer} from '@nestjs/websockets';
import {SpyService} from './spy.service';
import {Server} from 'socket.io';
import {Events} from './enums/events.enum';
import {SocketWithData} from '../types/socket-with-data.type';
import {MovementDto} from './dto/movement.dto';
import {OptionsDto} from './dto/options.dto';
import {OptionsOfCardsDto} from './dto/options-of-cards.dto';

@WebSocketGateway({
	namespace: 'spy',
	cors: { origin: '*' }
})
export class SpyGateway {
	@WebSocketServer()
	server: Server;

	constructor(private readonly _spyService: SpyService) {}

	handleConnection(socket: SocketWithData) {
		this._spyService.addUser(socket);
	}

	handleDisconnect(socket: SocketWithData) {
		this._spyService.removeUser(socket.data);
	}

	@SubscribeMessage(Events.CHANGE_NICKNAME)
	changeNickname(@MessageBody() nickname: string, @ConnectedSocket() socket: SocketWithData): string {
		if (!nickname) return '';
		return this._spyService.changeNickname(nickname, socket.data);
	}

	@SubscribeMessage(Events.CREATE_ROOM)
	createRoom(): string {
		return this._spyService.createRoom(this.server);
	}

	@SubscribeMessage(Events.CHECK_ROOM)
	checkRoom(@MessageBody() roomId: string): boolean {
		if (!roomId) return false;
		return this._spyService.checkRoom(roomId);
	}

	@SubscribeMessage(Events.JOIN_ROOM)
	joinRoom(@MessageBody() roomId: string, @ConnectedSocket() socket: SocketWithData): boolean {
		if (!roomId) return false;
		if (socket.data.roomId) return false;
		return this._spyService.joinRoom(roomId, socket.data);
	}

	@SubscribeMessage(Events.BECOME)
	become(@MessageBody() becomePlayer: boolean, @ConnectedSocket() socket: SocketWithData): boolean {
		if (becomePlayer === undefined) return false;
		return this._spyService.become(becomePlayer, socket.data);
	}

	@SubscribeMessage(Events.LEAVE_ROOM)
	laveRoom(@ConnectedSocket() socket: SocketWithData): boolean {
		this._spyService.leaveRoom(socket.data);
		return true;
	}

	@SubscribeMessage(Events.START_GAME)
	startGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!ownerKey) return;
		this._spyService.startGame(ownerKey, socket.data);
	}

	@SubscribeMessage(Events.STOP_GAME)
	stopGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!ownerKey) return;
		this._spyService.stopGame(ownerKey, socket.data);
	}

	@SubscribeMessage(Events.MOVE_CARDS)
	moveCards(@MessageBody() movement: MovementDto, @ConnectedSocket() socket: SocketWithData): void {
		if (!movement) return;
		return this._spyService.moveCards(movement, socket.data);
	}

	@SubscribeMessage(Events.PAUSE_GAME)
	pauseGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!ownerKey) return;
		return this._spyService.pauseGame(ownerKey, socket.data);
	}

	@SubscribeMessage(Events.RESUME_GAME)
	resumeGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!ownerKey) return;
		return this._spyService.resumeGame(ownerKey, socket.data);
	}

	@SubscribeMessage(Events.REQUEST_TIMER)
	requestTimer(@ConnectedSocket() socket: SocketWithData): void {
		return this._spyService.requestTimer(socket.data);
	}

	@SubscribeMessage(Events.CAPTURE_CARD)
	captureCard(@MessageBody() cardId: number, @ConnectedSocket() socket: SocketWithData): void {
		if (cardId === undefined) return;
		return this._spyService.captureCard(cardId, socket.data);
	}

	@SubscribeMessage(Events.ASK_CARD)
	askCard(@MessageBody() cardId: number, @ConnectedSocket() socket: SocketWithData): void {
		if (cardId === undefined) return;
		return this._spyService.askCard(cardId, socket.data);
	}

	@SubscribeMessage(Events.CHANGE_ROOM_OPTIONS)
	changeRoomOptions(@MessageBody() optionsDto: OptionsDto, @ConnectedSocket() socket: SocketWithData): boolean {
		if (!optionsDto) return false;
		return this._spyService.changeRoomOptions(optionsDto, socket.data);
	}

	@SubscribeMessage(Events.CHANGE_ROOM_OPTIONS_OF_CARDS)
	changeRoomOptionsOfCards(@MessageBody() optionsOfCardsDto: OptionsOfCardsDto, @ConnectedSocket() socket: SocketWithData): boolean {
		if (!optionsOfCardsDto) return false;
		return this._spyService.changeRoomOptionsOfCards(optionsOfCardsDto, socket.data);
	}

	@SubscribeMessage(Events.REQUEST_ROOM_OPTIONS)
	requestRoomOptions(@ConnectedSocket() socket: SocketWithData): void {
		return this._spyService.requestRoomOptions(socket.data);
	}

	@SubscribeMessage(Events.REQUEST_ROOM_OPTIONS_OF_CARDS)
	requestRoomOptionsOfCards(@ConnectedSocket() socket: SocketWithData): void {
		return this._spyService.requestRoomOptionsOfCards(socket.data);
	}
}
