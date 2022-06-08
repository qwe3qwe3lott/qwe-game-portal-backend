import {User} from '../types/user.type';

export class Player {
    private _id: number; public get id() { return this._id; }
    private _user: User; public set user(user: User) { this._user = user; } public get user() { return this._user; }
    public get nickname() { return this._user.nickname; }

    constructor(user: User, id: number) {
    	this._user = user;
    	this._id = id;
    }
}