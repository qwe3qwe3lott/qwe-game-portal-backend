import {Server} from 'socket.io';
import {User} from '../../types/user.type';
import {GameRoom} from '../../abstracts/game-room.abstract';
import {Player} from './player.entity';
import {State} from '../types/state.type';


export class Room extends GameRoom<Player, State> {
	protected get restrictionsToStart(): string[] { return []; }
	protected get playersPayload() { return this._state.players.map(player => ({ id: player.id, nickname: player.nickname })); }
	public constructor(server: Server) {
    	super(server);
	}

	public delete(): void { console.log(); }

	public start(ownerKey: string): void { console.log(ownerKey); }
	public stop(ownerKey: string): void { console.log(ownerKey); }
	public pause(ownerKey: string): void { console.log(ownerKey); }
	public resume(ownerKey: string): void { console.log(ownerKey); }

	public join(user: User): boolean { console.log(user); return true; }
	public become(user: User, becomePlayer: boolean): boolean { console.log(user); return becomePlayer; }
	public kick(user: User): void { console.log(user); }
}