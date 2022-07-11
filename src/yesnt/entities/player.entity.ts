import {GamePlayer} from '../../abstracts/game-player.abstract';
import {User} from '../../types/user.type';
import {Answers} from '../enums/answers.enum';

export class Player extends GamePlayer {
	private _answer?: Answers; public set answer(answer: Answers | undefined) { this._answer = answer; } public get answer() { return this._answer; }

	public constructor(user: User, id: number) {
		super(user, id);
	}
}