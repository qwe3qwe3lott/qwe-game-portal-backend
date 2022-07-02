import {User} from '../types/user.type';

export abstract class GamePlayer {
    private readonly _id: number; public get id() { return this._id; }
    private _user: User; public set user(user: User) { this._user = user; } public get user() { return this._user; }

    public get nickname() { return this._user.nickname; }

    protected constructor(user: User, id: number) {
    	this._user = user;
    	this._id = id;
    }
}