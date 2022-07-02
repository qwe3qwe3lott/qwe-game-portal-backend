import {Injectable, Logger} from '@nestjs/common';
import {Room} from './entities/room.entity';
import {User} from '../types/user.type';
import {IGameService} from '../interfaces/game-service.interface';
import {SocketWithData} from '../types/socket-with-data.type';
import {SocketData} from '../types/socket-data.type';
import {Events} from './enums/events.enum';


@Injectable()
export class YesntService implements IGameService {
    private readonly _logger: Logger = new Logger('YesntService');
    private readonly _rooms: Room[] = []
    private readonly _users: User[] = []

    addUser(socket: SocketWithData) {
    	const nickname = `User ${socket.id.substring(0, 6)}`;
    	const user: User = { id: socket.id, socket, nickname};
    	socket.data = { userId: socket.id, roomId: null };
    	this._users.push(user);
    	socket.emit(Events.GET_NICKNAME, { nickname, force: false });
    	this._logger.log('in ' + socket.id);
    }

    removeUser(socketData: SocketData) {
    	const userIndex = this._users.findIndex(user => user.id === socketData.userId);
    	if (userIndex === -1) return;
    	if (socketData.roomId) {
    		const room = this._rooms.find(room => room.id === socketData.roomId);
    		if (room) room.kick(this._users[userIndex]);
    	}
    	this._users.splice(userIndex, 1);
    	this._logger.log('out ' + socketData.userId);
    }
}
