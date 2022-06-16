import {Directions} from '../enums/directions.enum';

export type FieldCard = {
    id: number
    title: string
    captured: boolean
    url: string
    markMovedDirection?: Directions
    markTeleportedDirection?: Directions
    markCaptured?: boolean
    markAsked?: boolean
}