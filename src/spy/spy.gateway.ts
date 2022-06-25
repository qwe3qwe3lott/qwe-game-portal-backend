import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer} from '@nestjs/websockets';
import {SpyService} from './spy.service';
import {Server} from 'socket.io';
import {Logger} from '@nestjs/common';
import {Events} from './enums/events.enum';
import {SocketWithData} from './types/socket-with-data.type';
import {User} from './types/user.type';
import {MovementDto} from './dto/movement.dto';
import {OptionsDto} from './dto/options.dto';

@WebSocketGateway({
	namespace: 'spy',
	cors: {
		origin: '*'
	}
})
export class SpyGateway {
	@WebSocketServer()
	server: Server;
	private logger: Logger = new Logger('SpyGateway');

	constructor(private readonly spyService: SpyService) {}

	handleConnection(socket: SocketWithData) {
		const nickname = `User ${socket.id.substring(0, 6)}`;
		const user: User = {
			id: socket.id,
			socket,
			nickname
		};
		socket.data = {
			userId: socket.id,
			roomId: null
		};
		this.logger.log('in ' + socket.id);
		this.spyService.addUser(user);
		socket.emit(Events.GET_NICKNAME, { nickname, force: false });
	}

	handleDisconnect(socket: SocketWithData) {
		this.spyService.removeUser(socket.data);
		this.logger.log('out ' + socket.data.userId);
	}

	@SubscribeMessage(Events.CHANGE_NICKNAME)
	changeNickname(@MessageBody() nickname: string, @ConnectedSocket() socket: SocketWithData): string {
		if (!nickname) return '';
		return this.spyService.changeNickname(nickname, socket.data);
	}

	@SubscribeMessage(Events.CREATE_ROOM)
	createRoom(): string {
		return this.spyService.createRoom(this.server);
	}

	@SubscribeMessage(Events.CHECK_ROOM)
	checkRoom(@MessageBody() roomId: string): boolean {
		if (!roomId) return false;
		return this.spyService.checkRoom(roomId);
	}

	@SubscribeMessage(Events.JOIN_ROOM)
	joinRoom(@MessageBody() roomId: string, @ConnectedSocket() socket: SocketWithData): boolean {
		if (!roomId) return false;
		if (socket.data.roomId) return false;
		return this.spyService.joinRoom(roomId, socket.data);
	}

	@SubscribeMessage(Events.BECOME)
	become(@MessageBody() becomePlayer: boolean, @ConnectedSocket() socket: SocketWithData): boolean {
		if (becomePlayer === undefined) return false;
		return this.spyService.become(becomePlayer, socket.data);
	}

	@SubscribeMessage(Events.LEAVE_ROOM)
	laveRoom(@ConnectedSocket() socket: SocketWithData): boolean {
		this.spyService.leaveRoom(socket.data);
		return true;
	}

	@SubscribeMessage(Events.START_GAME)
	startGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!ownerKey) return;
		this.spyService.startGame(ownerKey, socket.data);
	}

	@SubscribeMessage(Events.STOP_GAME)
	stopGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!ownerKey) return;
		this.spyService.stopGame(ownerKey, socket.data);
	}

	@SubscribeMessage(Events.MOVE_CARDS)
	moveCards(@MessageBody() movement: MovementDto, @ConnectedSocket() socket: SocketWithData): void {
		if (!movement) return;
		return this.spyService.moveCards(movement, socket.data);
	}

	@SubscribeMessage(Events.PAUSE_GAME)
	pauseGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!ownerKey) return;
		return this.spyService.pauseGame(ownerKey, socket.data);
	}

	@SubscribeMessage(Events.RESUME_GAME)
	resumeGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		if (!ownerKey) return;
		return this.spyService.resumeGame(ownerKey, socket.data);
	}

	@SubscribeMessage(Events.REQUEST_TIMER)
	requestTimer(@ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.requestTimer(socket.data);
	}

	@SubscribeMessage(Events.CAPTURE_CARD)
	captureCard(@MessageBody() cardId: number, @ConnectedSocket() socket: SocketWithData): void {
		if (cardId === undefined) return;
		return this.spyService.captureCard(cardId, socket.data);
	}

	@SubscribeMessage(Events.ASK_CARD)
	askCard(@MessageBody() cardId: number, @ConnectedSocket() socket: SocketWithData): void {
		if (cardId === undefined) return;
		return this.spyService.askCard(cardId, socket.data);
	}

	@SubscribeMessage(Events.CHANGE_ROOM_OPTIONS)
	changeRoomOptions(@MessageBody() optionsDto: OptionsDto, @ConnectedSocket() socket: SocketWithData): boolean {
		if (!optionsDto) return false;
		return this.spyService.changeRoomOptions(optionsDto, socket.data);
	}

	@SubscribeMessage(Events.REQUEST_ROOM_OPTIONS)
	requestRoomOptions(@ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.requestRoomOptions(socket.data);
	}
}
