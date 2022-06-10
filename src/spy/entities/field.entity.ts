import {FieldCard} from '../types/field-card.type';
import {MovementDto} from '../dto/movement.dto';
import {Sizes} from '../types/sizes.type';
import {rgbToHex} from '../util/rgb-to-hex.util';

export class Field {
	public static COLOR_EMPTY: '#ffffff'
    private _cards: FieldCard[]; public get cards() { return this._cards; }
    private _sizes: Sizes; public get sizes() { return this._sizes; }
	private _paintedCards: FieldCard[]

	constructor(cards: FieldCard[], sizes: Sizes) {
    	this._cards = cards;
    	this._sizes = sizes;
    	this._paintedCards = [];
	}

	private cleanCards() {
		for (const paintedCard of this._paintedCards) {
			paintedCard.color = Field.COLOR_EMPTY;
		}
		this._paintedCards.length = 0;
	}

	move(movement: MovementDto) {
    	this.cleanCards();
    	if (movement.isRow) {
    		const firstCardIndex = (movement.id-1) * this._sizes.columns;
    		const lastCardIndex = movement.id * this._sizes.columns - 1;
    	    if (movement.forward) {
    	    	const lastCard = this._cards[lastCardIndex];
    	    	lastCard.color = '#7fff7f';
				this._paintedCards.push(lastCard);
    			for (let i = lastCardIndex; i > firstCardIndex; i--) {
    				const card = this._cards[i-1];
    				const rb = Math.round(255 - (((i % this._sizes.columns) / this._sizes.columns) * 128));
					card.color = rgbToHex(rb,255, rb);
    				this._paintedCards.push(card);
					this._cards[i] = card;
    			}
    			this._cards[firstCardIndex] = lastCard;
    		} else {
    	    	const firstCard = this._cards[firstCardIndex];
				firstCard.color = '#7fff7f';
				this._paintedCards.push(firstCard);
    			for (let i = firstCardIndex; i < lastCardIndex; i++) {
    				const card = this._cards[i+1];
					const rb = Math.round(255 - ((1 - ((i % this._sizes.columns) / this._sizes.columns)) * 128));
					card.color = rgbToHex(rb,255, rb);
					this._paintedCards.push(card);
    				this._cards[i] = card;
    			}
    			this._cards[lastCardIndex] = firstCard;
    		}
    	} else {
    		const firstCardIndex = movement.id - 1;
    		const lastCardIndex = this._sizes.columns * this._sizes.rows - 1 - (this._sizes.columns - movement.id);
    		if (movement.forward) {
    			const lastCard = this._cards[lastCardIndex];
				lastCard.color = '#7fff7f';
				this._paintedCards.push(lastCard);
    			for (let i = lastCardIndex; i > firstCardIndex; i -= this._sizes.columns) {
    				const card = this._cards[i-this._sizes.columns];
					const rb = Math.round(255 - ((Math.trunc(i / this._sizes.columns) / this._sizes.columns) * 128));
					card.color = rgbToHex(rb,255, rb);
					this._paintedCards.push(card);
    				this._cards[i] = card;
    			}
    			this._cards[movement.id-1] = lastCard;
    		} else {
    			const firstCard = this._cards[firstCardIndex];
				firstCard.color = '#7fff7f';
				this._paintedCards.push(firstCard);
    			for (let i = firstCardIndex; i < lastCardIndex; i += this._sizes.columns) {
					const card = this._cards[i+this._sizes.columns];
					const rb = Math.round(255 - ((1 - (Math.trunc(i / this._sizes.columns) / this._sizes.columns)) * 128));
					card.color = rgbToHex(rb,255, rb);
					this._paintedCards.push(card);
					this._cards[i] = card;
    			}
    			this._cards[lastCardIndex] = firstCard;
    		}
    	}
	}
}