import {FieldCard} from '../types/field-card.type';
import {MovementDto} from '../dto/movement.dto';
import {Sizes} from '../types/sizes.type';
import {rgbToHex} from '../util/rgb-to-hex.util';

export class Field {
	public static COLOR_EMPTY = '#ffffff'
	public static COLOR_CAPTURE = '#7fff7f'
	public static COLOR_CAPTURE_FAIL = '#ff0000'
	public static COLOR_ASK = '#ff7f00'
    private readonly _cards: FieldCard[]; public get cards() { return this._cards; }
    private readonly _sizes: Sizes; public get sizes() { return this._sizes; }
	private readonly _paintedCards: FieldCard[]
	private readonly _availableCards: FieldCard[]

	constructor(cards: FieldCard[], sizes: Sizes, availableCards: FieldCard[]) {
    	this._cards = cards;
    	this._sizes = sizes;
    	this._paintedCards = [];
    	this._availableCards = availableCards;
	}

	private cleanCards(): void {
		for (const paintedCard of this._paintedCards) {
			paintedCard.color = Field.COLOR_EMPTY;
		}
		this._paintedCards.length = 0;
	}

	private static getMovementColorByPercent(percent: number): string {
		const rb = Math.round(255 - (percent * 128));
		return rgbToHex(rb,255, rb);
	}

	capture(card: FieldCard, captured: boolean): FieldCard | null {
    	this.cleanCards();
    	if (captured) card.captured = true;
    	card.color = captured ? Field.COLOR_CAPTURE : Field.COLOR_CAPTURE_FAIL;
    	this._paintedCards.push(card);
    	return captured ? this._availableCards.shift() : null;
	}

	ask(card: FieldCard, cardsOfPlayer: FieldCard[]): number {
    	this.cleanCards();
    	let spiesCount = 0;
    	let cardIndex = this._cards.findIndex(c => c === card) - this._sizes.columns;
		if (cardIndex >= 0) spiesCount += this.askRow(cardIndex, cardsOfPlayer);
		cardIndex += this._sizes.columns;
		spiesCount += this.askRow(cardIndex, cardsOfPlayer);
		cardIndex += this._sizes.columns;
		spiesCount += this.askRow(cardIndex, cardsOfPlayer);
    	return spiesCount;
	}

	private askRow(cardIndex: number, cardsOfPlayer: FieldCard[]): number {
    	let spiesCount = 0;
		for (let i = (cardIndex % this._sizes.columns === 0 ? cardIndex : cardIndex-1);
			 i <= (cardIndex % this._sizes.columns === this._sizes.columns-1 ? cardIndex : cardIndex+1);
			 i++) {
			if (this._cards[i]) {
				if (this.askCard(i, cardsOfPlayer)) spiesCount++;
				this._cards[i].color = Field.COLOR_ASK;
				this._paintedCards.push(this._cards[i]);
			}
		}
		return spiesCount;
	}

	private askCard(cardIndex: number, cardsOfPlayer: FieldCard[]): boolean {
    	return cardsOfPlayer.some(playerCard => playerCard === this._cards[cardIndex]);
	}

	getActCardIds(card: FieldCard): number[] {
    	const ids: number[] = [];
		let cardIndex = this._cards.findIndex(c => c === card) - this._sizes.columns;
		if (cardIndex >= 0) ids.push(...this.getActCardIdsFromRow(cardIndex));
		cardIndex += this._sizes.columns;
		ids.push(...this.getActCardIdsFromRow(cardIndex));
		cardIndex += this._sizes.columns;
		ids.push(...this.getActCardIdsFromRow(cardIndex));
		return ids;
	}

	getActCardIdsFromRow(cardIndex: number): number[] {
    	const ids: number[] = [];
		for (let i = (cardIndex % this._sizes.columns === 0 ? cardIndex : cardIndex-1);
			 i <= (cardIndex % this._sizes.columns === this._sizes.columns-1 ? cardIndex : cardIndex+1);
			 i++) {
			if (this._cards[i]) ids.push(this._cards[i].id);
		}
		return ids;
	}

	checkOpportunity(sourceCard: FieldCard, targetCard: FieldCard): boolean {
		let cardIndex = this._cards.findIndex(card => card === sourceCard) - this._sizes.columns;
		if (cardIndex >= 0 || this.checkOpportunityFromRow(cardIndex, targetCard)) return true;
		cardIndex += this._sizes.columns;
		if (this.checkOpportunityFromRow(cardIndex, targetCard)) return true;
		cardIndex += this._sizes.columns;
		if (this.checkOpportunityFromRow(cardIndex, targetCard)) return true;
		return false;
	}
	checkOpportunityFromRow(cardIndex: number, targetCard: FieldCard): boolean {
		for (let i = (cardIndex % this._sizes.columns === 0 ? cardIndex : cardIndex-1);
			 i <= (cardIndex % this._sizes.columns === this._sizes.columns-1 ? cardIndex : cardIndex+1);
			 i++) {
			if (this._cards[i] === targetCard) return true;
		}
		return false;
	}

	move(movement: MovementDto): void {
    	this.cleanCards();
    	if (movement.isRow) {
    		const firstCardIndex = (movement.id-1) * this._sizes.columns;
    		const lastCardIndex = movement.id * this._sizes.columns - 1;
    	    if (movement.forward) {
    	    	const lastCard = this._cards[lastCardIndex];
    	    	lastCard.color = '#7fff7f';
				this._paintedCards.push(lastCard);
				let counter = this._sizes.columns;
				for (let i = lastCardIndex; i > firstCardIndex; i--) {
    				const card = this._cards[i-1];
					card.color = Field.getMovementColorByPercent(--counter / this._sizes.columns);
    				this._paintedCards.push(card);
					this._cards[i] = card;
    			}
    			this._cards[firstCardIndex] = lastCard;
    		} else {
    	    	const firstCard = this._cards[firstCardIndex];
				firstCard.color = '#7fff7f';
				this._paintedCards.push(firstCard);
				let counter = this._sizes.columns;
    			for (let i = firstCardIndex; i < lastCardIndex; i++) {
    				const card = this._cards[i+1];
					card.color = Field.getMovementColorByPercent(--counter / this._sizes.columns);
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
				let counter = this._sizes.rows;
    			for (let i = lastCardIndex; i > firstCardIndex; i -= this._sizes.columns) {
    				const card = this._cards[i-this._sizes.columns];
					card.color = Field.getMovementColorByPercent(--counter / this._sizes.rows);
					this._paintedCards.push(card);
    				this._cards[i] = card;
    			}
    			this._cards[movement.id-1] = lastCard;
    		} else {
    			const firstCard = this._cards[firstCardIndex];
				firstCard.color = '#7fff7f';
				this._paintedCards.push(firstCard);
				let counter = this._sizes.rows;
				for (let i = firstCardIndex; i < lastCardIndex; i += this._sizes.columns) {
					const card = this._cards[i+this._sizes.columns];
					card.color = Field.getMovementColorByPercent(--counter / this._sizes.rows);
					this._paintedCards.push(card);
					this._cards[i] = card;
    			}
    			this._cards[lastCardIndex] = firstCard;
    		}
    	}
	}
}