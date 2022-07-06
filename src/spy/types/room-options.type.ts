import {GameRoomOptions} from '../../types/game-room-options.type';

export type RoomOptions = GameRoomOptions & {
    rows: number
    columns: number
    secondsToAct: number
    winScore: number
}