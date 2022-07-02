import {User} from '../../types/user.type';
import {FieldCard} from '../types/field-card.type';
import {GamePlayer} from '../../abstracts/game-player.abstract';

export class Player extends GamePlayer {
    private _score: number; public set score(score: number) { this._score = score; } public get score() { return this._score; }
    private _card: FieldCard; public set card(card: FieldCard) { this._card = card; } public get card() { return this._card; }

    public constructor(user: User, id: number, card: FieldCard) {
    	super(user, id);
    	this._score = 0;
    	this._card = card;
    }
}