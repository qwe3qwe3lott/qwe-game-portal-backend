import {FieldCard} from '../types/field-card.type';
import {MovementDto} from '../dto/movement.dto';
import {Sizes} from '../types/sizes.type';

export class Field {
    private _cards: FieldCard[]; public get cards() { return this._cards; }
    private _sizes: Sizes; public get sizes() { return this._sizes; }
    private _activeCards: FieldCard[]

    constructor(cards: FieldCard[], sizes: Sizes) {
    	this._cards = cards;
    	this._sizes = sizes;
    	this._activeCards = [];
    }

    move(movement: MovementDto) {
    	if (movement.isRow) {
    		const firstCardIndex = (movement.id-1) * this._sizes.columns;
    		const lastCardIndex = movement.id * this._sizes.columns - 1;
    	    if (movement.forward) {
    	    	const lastCard = this._cards[lastCardIndex];
    			for (let i = lastCardIndex; i > firstCardIndex; i--) {
    				this._cards[i] = this._cards[i-1];
    			}
    			this._cards[firstCardIndex] = lastCard;
    		} else {
    	    	const firstCard = this._cards[firstCardIndex];
    			for (let i = firstCardIndex; i < lastCardIndex; i++) {
    				this._cards[i] = this._cards[i+1];
    			}
    			this._cards[lastCardIndex] = firstCard;
    		}
    	} else {
    		const firstCardIndex = movement.id - 1;
    		const lastCardIndex = this._sizes.columns * this._sizes.rows - 1 - (this._sizes.columns - movement.id);
    		if (movement.forward) {
    			const lastCard = this._cards[lastCardIndex];
    			for (let i = lastCardIndex; i > firstCardIndex; i -= this._sizes.columns) {
    				this._cards[i] = this._cards[i-this._sizes.columns];
    			}
    			this._cards[movement.id-1] = lastCard;
    		} else {
    			const firstCard = this._cards[firstCardIndex];
    			for (let i = firstCardIndex; i < lastCardIndex; i += this._sizes.columns) {
    				this._cards[i] = this._cards[i+this._sizes.columns];
    			}
    			this._cards[lastCardIndex] = firstCard;
    		}
    	}
    }
}