import {CardOptions} from './card-option.type';

export type RoomOptions = {
    minPlayers: number
    maxPlayers: number
    rows: number
    columns: number
    secondsToAct: number
    winScore: number
    optionsOfCards: CardOptions[]
}