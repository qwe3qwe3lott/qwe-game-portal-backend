import {Directions} from '../enums/directions.enum';

export type FieldCard = {
    id: number
    title: string
    captured: boolean
    markMovedPercent?: number
    markMovedDirection?: Directions
    markCaptured?: boolean
    markAsked?: boolean
}