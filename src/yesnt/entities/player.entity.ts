import {GamePlayer} from '../../abstracts/game-player.abstract';
import {User} from '../../types/user.type';

export class Player extends GamePlayer {
	public constructor(user: User, id: number) {
		super(user, id);
	}
}