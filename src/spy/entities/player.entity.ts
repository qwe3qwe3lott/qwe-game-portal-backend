import {User} from '../types/user.type';
import {FieldCard} from '../types/field-card.type';

export class Player {
    private readonly _id: number; public get id() { return this._id; }
    private _user: User; public set user(user: User) { this._user = user; } public get user() { return this._user; }
    private _score: number; public set score(score: number) { this._score = score; } public get score() { return this._score; }
    private _card: FieldCard; public set card(card: FieldCard) { this._card = card; } public get card() { return this._card; }

    public get nickname() { return this._user.nickname; }

    constructor(user: User, id: number, card: FieldCard) {
    	this._user = user;
    	this._id = id;
    	this._score = 0;
    	this._card = card;
    }
}