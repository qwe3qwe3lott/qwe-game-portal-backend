import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketServer} from '@nestjs/websockets';
import {Server} from 'socket.io';
import {SocketWithData} from '../types/socket-with-data.type';
import {GameEvents} from '../enums/game-events.enum';
import {GameService} from './game-service.abstract';
import {GameRoom} from './game-room.abstract';
import {GamePlayer} from './game-player.abstract';
import {RoomState} from '../types/room-state.type';

export abstract class GameGateway<S extends GameService<GameRoom<GamePlayer, RoomState<GamePlayer>>>> {
    @WebSocketServer()
    private _server: Server;

    protected constructor(protected readonly _service: S) {}

    handleConnection(socket: SocketWithData) { this._service.addUser(socket); }
    handleDisconnect(socket: SocketWithData) { this._service.removeUser(socket.data); }

    @SubscribeMessage(GameEvents.CHANGE_NICKNAME)
    changeNickname(@MessageBody() nickname: string, @ConnectedSocket() socket: SocketWithData): string {
    	if (!nickname) return '';
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
}
