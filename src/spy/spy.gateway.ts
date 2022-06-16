import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer} from '@nestjs/websockets';
import {SpyService} from './spy.service';
import {Server} from 'socket.io';
import {Logger} from '@nestjs/common';
import {SpyWSEvents} from './enums/spy-ws-events.enum';
import {SocketWithData} from './types/socket-with-data.type';
import {User} from './types/user.type';
import {generateNickname} from './util/generate-nickname.util';
import {MovementDto} from './dto/movement.dto';
import {OptionsDto} from './dto/options.dto';
import {RoomOptions} from './types/room-options.type';

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
		const nickname = generateNickname();
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
		socket.emit(SpyWSEvents.GET_NICKNAME, { nickname, force: false });
	}

	handleDisconnect(socket: SocketWithData) {
		this.spyService.removeUser(socket.data);
		this.logger.log('out ' + socket.data.userId);
	}

	@SubscribeMessage(SpyWSEvents.CHANGE_NICKNAME)
	changeNickname(@MessageBody() nickname: string, @ConnectedSocket() socket: SocketWithData): boolean {
		return this.spyService.changeNickname(nickname, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.CREATE_ROOM)
	createRoom(@MessageBody() roomOptions: RoomOptions): string {
		return this.spyService.createRoom(this.server, roomOptions);
	}

	@SubscribeMessage(SpyWSEvents.CHECK_ROOM)
	checkRoom(@MessageBody() roomId: string): boolean {
		return this.spyService.checkRoom(roomId);
	}

	@SubscribeMessage(SpyWSEvents.JOIN_ROOM)
	joinRoom(@MessageBody() roomId: string, @ConnectedSocket() socket: SocketWithData): boolean {
		if (socket.data.roomId) return false;
		return this.spyService.joinRoom(roomId, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.BECOME)
	become(@MessageBody() becomePlayer: boolean, @ConnectedSocket() socket: SocketWithData): boolean {
		return this.spyService.become(becomePlayer, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.LEAVE_ROOM)
	laveRoom(@ConnectedSocket() socket: SocketWithData): boolean {
		this.spyService.leaveRoom(socket.data);
		return true;
	}

	@SubscribeMessage(SpyWSEvents.START_GAME)
	startGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		this.spyService.startGame(ownerKey, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.STOP_GAME)
	stopGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		this.spyService.stopGame(ownerKey, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.MOVE_CARDS)
	moveCards(@MessageBody() movement: MovementDto, @ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.moveCards(movement, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.PAUSE_GAME)
	pauseGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.pauseGame(ownerKey, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.RESUME_GAME)
	resumeGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.resumeGame(ownerKey, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.REQUEST_TIMER)
	requestTimer(@ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.requestTimer(socket.data);
	}

	@SubscribeMessage(SpyWSEvents.CAPTURE_CARD)
	captureCard(@MessageBody() cardId: number, @ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.captureCard(cardId, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.ASK_CARD)
	askCard(@MessageBody() cardId: number, @ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.askCard(cardId, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.CHANGE_ROOM_OPTIONS)
	changeRoomOptions(@MessageBody() optionsDto: OptionsDto, @ConnectedSocket() socket: SocketWithData): boolean {
		return this.spyService.changeRoomOptions(optionsDto, socket.data);
	}

	@SubscribeMessage(SpyWSEvents.REQUEST_ROOM_OPTIONS)
	requestRoomOptions(@ConnectedSocket() socket: SocketWithData): void {
		return this.spyService.requestRoomOptions(socket.data);
	}
}
