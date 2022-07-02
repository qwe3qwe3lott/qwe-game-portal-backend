import {Injectable} from '@nestjs/common';
import {Room} from './entities/room.entity';
import {GameService} from '../abstracts/game-service.abstract';
import {Server} from 'socket.io';


@Injectable()
export class YesntService extends GameService<Room> {
	constructor() { super('YesntService'); }

	createRoom(server: Server): string {
		const room = new Room(server);
		this._rooms.push(room);
		this._logger.log(`Room ${room.id} created`);
		return room.id;
	}
}
