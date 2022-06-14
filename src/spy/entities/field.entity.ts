import {FieldCard} from '../types/field-card.type';
import {MovementDto} from '../dto/movement.dto';
import {Sizes} from '../types/sizes.type';
import {Directions} from '../enums/directions.enum';

export class Field {
    private readonly _cards: FieldCard[]; public get cards() { return this._cards; }
    private readonly _sizes: Sizes; public get sizes() { return this._sizes; }
	private readonly _markedCards: FieldCard[]
	private readonly _availableCards: FieldCard[]

	constructor(cards: FieldCard[], sizes: Sizes, availableCards: FieldCard[]) {
    	this._cards = cards;
    	this._sizes = sizes;
    	this._markedCards = [];
    	this._availableCards = availableCards;
	}

	private unmarkCards(): void {
		for (const markedCard of this._markedCards) {
			delete markedCard.markMovedPercent;
			delete markedCard.markMovedDirection;
			delete markedCard.markCaptured;
			delete markedCard.markAsked;
		}
		this._markedCards.length = 0;
	}

	capture(card: FieldCard, captured: boolean): FieldCard | null {
    	this.unmarkCards();
    	if (captured) card.captured = true;
    	card.markCaptured = captured;
    	this._markedCards.push(card);
    	return captured ? this._availableCards.shift() : null;
	}

	ask(card: FieldCard, cardsOfPlayer: FieldCard[]): number {
    	this.unmarkCards();
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
				this._cards[i].markAsked = true;
				this._markedCards.push(this._cards[i]);
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

	// Двинуть столбец или строку на игровом поле
	move(movement: MovementDto): void {
		this.unmarkCards();
		// Индексы первой и последней карты в столбце или строке
		// id у карт начинаются с 1
		const firstCardIndex = movement.isRow ? (movement.id - 1) * this._sizes.columns : movement.id - 1;
		const lastCardIndex = movement.isRow ? movement.id * this._sizes.columns - 1 : this._sizes.columns * this._sizes.rows - 1 - (this._sizes.columns - movement.id);
		// Шаг между индексами карт в строке или столбце
		const indexStep = movement.isRow ? (movement.forward ? -1 : 1) : (movement.forward ? -this._sizes.columns : this._sizes.columns);
		const direction = movement.isRow ? (movement.forward ? Directions.RIGHT : Directions.LEFT) : (movement.forward ? Directions.DOWN : Directions.UP);
		// Карта, которую нужно перенести на другой конец строки или столбца
		const cardToTeleport = this._cards[movement.forward ? lastCardIndex : firstCardIndex];
		cardToTeleport.markMovedPercent = 1;
		cardToTeleport.markMovedDirection = direction;
		this._markedCards.push(cardToTeleport);
		// Количество карт в строке или столбце и счётчик для покраски карты процентно
		const cardsCount = movement.isRow ? this._sizes.columns : this._sizes.rows;
		let counter = cardsCount;
		// Двигаем и помечаем карты
		for (let i = (movement.forward ? lastCardIndex : firstCardIndex); (movement.forward ? i > firstCardIndex : i < lastCardIndex); i += indexStep) {
			const tempCard = this._cards[i + indexStep];
			tempCard.markMovedPercent = --counter / cardsCount;
			tempCard.markMovedDirection = direction;
			this._markedCards.push(tempCard);
			this._cards[i] = tempCard;
		}
		// Двигаем карту на другой конец строки или столбца
		this._cards[movement.forward ? firstCardIndex : lastCardIndex] = cardToTeleport;
	}

	// Страрая версия метода
	/*move(movement: MovementDto): void {
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
    			this._cards[firstCardIndex] = lastCard;
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
	}*/
}