import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketServer} from '@nestjs/websockets';
import {Server} from 'socket.io';
import {SocketWithData} from '../types/socket-with-data.type';
import {GameEvents} from '../enums/game-events.enum';
import {GameService} from './game-service.abstract';
import {GameRoom} from './game-room.abstract';
import {GamePlayer} from './game-player.abstract';
import {RoomState} from '../types/room-state.type';
import {GameRoomOptions} from '../types/game-room-options.type';
import {ChangeOptionsDto} from '../dto/change-options.dto';
import {GamePlayersPayload} from '../types/game-players-payload.type';
import {RenameRoomDto} from '../dto/rename-room.dto';

export abstract class GameGateway<
    SERVICE extends GameService<GameRoom<GamePlayer, RoomState<GamePlayer>, STATUS, OPTIONS, GamePlayersPayload>, OPTIONS, STATUS>,
    OPTIONS extends GameRoomOptions,
    STATUS extends string
    > {
    private readonly MIN_ROOM_TITLE_LENGTH = 3;
    private readonly MAX_ROOM_TITLE_LENGTH = 30;
    private readonly MIN_USER_NICKNAME_LENGTH = 3;
    private readonly MAX_USER_NICKNAME_LENGTH = 30;
    @WebSocketServer()
    private _server: Server;

    protected constructor(protected readonly _service: SERVICE) {}

    handleConnection(socket: SocketWithData) { this._service.addUser(socket); }
    handleDisconnect(socket: SocketWithData) { this._service.removeUser(socket.data); }

    @SubscribeMessage(GameEvents.CHANGE_NICKNAME)
    changeNickname(@MessageBody() nickname: string, @ConnectedSocket() socket: SocketWithData): string {
    	if (!nickname) return '';
    	if (nickname.length < this.MIN_USER_NICKNAME_LENGTH) return '';
    	if (nickname.length > this.MAX_USER_NICKNAME_LENGTH) nickname = nickname.substring(0, this.MAX_USER_NICKNAME_LENGTH);
    	return this._service.changeNickname(nickname, socket.data);
    }

    @SubscribeMessage(GameEvents.CREATE_ROOM)
    createRoom(): string {
    	return this._service.createRoom(this._server);
    }

    @SubscribeMessage(GameEvents.CHECK_ROOM)
    checkRoom(@MessageBody() roomId: string): boolean {
    	if (!roomId) return false;
    	return this._service.checkRoom(roomId);
    }

    @SubscribeMessage(GameEvents.JOIN_ROOM)
    joinRoom(@MessageBody() roomId: string, @ConnectedSocket() socket: SocketWithData): boolean {
    	if (!roomId) return false;
    	if (socket.data.roomId) return false;
    	return this._service.joinRoom(roomId, socket.data);
    }

    @SubscribeMessage(GameEvents.BECOME)
    become(@MessageBody() becomePlayer: boolean, @ConnectedSocket() socket: SocketWithData): boolean {
    	if (becomePlayer === undefined) return false;
    	return this._service.become(becomePlayer, socket.data);
    }

    @SubscribeMessage(GameEvents.LEAVE_ROOM)
    laveRoom(@ConnectedSocket() socket: SocketWithData): boolean {
    	this._service.leaveRoom(socket.data);
    	return true;
    }

    @SubscribeMessage(GameEvents.RENAME_ROOM)
    renameRoom(@MessageBody() renameRoomDto: RenameRoomDto, @ConnectedSocket() socket: SocketWithData): boolean {
    	if (!renameRoomDto || !renameRoomDto.roomTitle || !renameRoomDto.ownerKey) return false;
    	if (renameRoomDto.roomTitle.length < this.MIN_ROOM_TITLE_LENGTH) return false;
    	if (renameRoomDto.roomTitle.length > this.MAX_ROOM_TITLE_LENGTH) renameRoomDto.roomTitle = renameRoomDto.roomTitle.substring(0, this.MAX_ROOM_TITLE_LENGTH);
    	return this._service.renameRoom(renameRoomDto, socket.data);
    }

    @SubscribeMessage(GameEvents.START_GAME)
    startGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
    	if (!ownerKey) return;
    	this._service.startGame(ownerKey, socket.data);
    }

    @SubscribeMessage(GameEvents.STOP_GAME)
    stopGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
    	if (!ownerKey) return;
    	this._service.stopGame(ownerKey, socket.data);
    }

    @SubscribeMessage(GameEvents.PAUSE_GAME)
    pauseGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
    	if (!ownerKey) return;
    	return this._service.pauseGame(ownerKey, socket.data);
    }

    @SubscribeMessage(GameEvents.RESUME_GAME)
    resumeGame(@MessageBody() ownerKey: string, @ConnectedSocket() socket: SocketWithData): void {
    	if (!ownerKey) return;
    	return this._service.resumeGame(ownerKey, socket.data);
    }

    @SubscribeMessage(GameEvents.REQUEST_TIMER)
    requestTimer(@ConnectedSocket() socket: SocketWithData): void {
    	return this._service.requestTimer(socket.data);
    }

    @SubscribeMessage(GameEvents.CHANGE_ROOM_OPTIONS)
    changeRoomOptions(@MessageBody() changeOptionsDto: ChangeOptionsDto<OPTIONS>, @ConnectedSocket() socket: SocketWithData): boolean {
    	if (!changeOptionsDto) return false;
    	return this._service.changeRoomOptions(changeOptionsDto, socket.data);
    }

    @SubscribeMessage(GameEvents.REQUEST_ROOM_OPTIONS)
    requestRoomOptions(@ConnectedSocket() socket: SocketWithData): void {
    	return this._service.requestRoomOptions(socket.data);
    }
}
