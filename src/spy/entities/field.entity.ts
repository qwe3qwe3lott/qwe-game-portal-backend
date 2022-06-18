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

	unmarkCards(): void {
		for (const markedCard of this._markedCards) {
			delete markedCard.markMovedDirection;
			delete markedCard.markTeleportedDirection;
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
    	const cardIndex = this._cards.findIndex(c => c === card);
		const cardsAround = this.getCardsAround(cardIndex);
		for (const card of cardsAround) {
			if (cardsOfPlayer.some(playerCard => playerCard === card)) spiesCount++;
		}
		for (const card of cardsAround) {
			card.markAsked = spiesCount > 0;
			this._markedCards.push(card);
		}
    	return spiesCount;
	}

	private getCardsAround(cardIndex: number): FieldCard[] {
    	const cards: FieldCard[] = [];
    	if (cardIndex - this._sizes.columns >= 0) cards.push(...this.getCardsInRow(cardIndex - this._sizes.columns));
    	cards.push(...this.getCardsInRow(cardIndex));
    	if (cardIndex + this._sizes.columns < this._sizes.columns * this._sizes.rows) cards.push(...this.getCardsInRow(cardIndex + this._sizes.columns));
    	return cards;
	}

	private getCardsInRow(cardIndex: number): FieldCard[] {
		const cards: FieldCard[] = [];
		for (let i = (cardIndex % this._sizes.columns === 0 ? cardIndex : cardIndex-1);
			 i <= (cardIndex % this._sizes.columns === this._sizes.columns-1 ? cardIndex : cardIndex+1);
			 i++) {
			if (this._cards[i]) cards.push(this._cards[i]);
		}
		return cards;
	}

	getActCardIds(card: FieldCard): number[] {
		const cardIndex = this._cards.findIndex(c => c === card);
		const cardsAround = this.getCardsAround(cardIndex);
		return cardsAround.map(card => card.id);
	}

	checkOpportunity(sourceCard: FieldCard, targetCard: FieldCard): boolean {
		const cardIndex = this._cards.findIndex(card => card === sourceCard);
		const cardsAround = this.getCardsAround(cardIndex);
		return cardsAround.some(card => card === targetCard);
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
		cardToTeleport.markTeleportedDirection = Field.getOppositeDirection(direction);
		this._markedCards.push(cardToTeleport);
		// Двигаем и помечаем карты
		for (let i = (movement.forward ? lastCardIndex : firstCardIndex); (movement.forward ? i > firstCardIndex : i < lastCardIndex); i += indexStep) {
			const tempCard = this._cards[i + indexStep];
			tempCard.markMovedDirection = direction;
			this._markedCards.push(tempCard);
			this._cards[i] = tempCard;
		}
		// Двигаем карту на другой конец строки или столбца
		this._cards[movement.forward ? firstCardIndex : lastCardIndex] = cardToTeleport;
	}

	private static getOppositeDirection(direction: Directions): Directions {
    	switch (direction) {
		case Directions.UP:
			return Directions.DOWN;
		case Directions.DOWN:
			return Directions.UP;
		case Directions.LEFT:
			return Directions.RIGHT;
		case Directions.RIGHT:
			return Directions.LEFT;
		default:
			return Directions.UP;
		}
	}
}