import {GameRoomOptions} from '../../types/game-room-options.type';

export type RoomOptions = GameRoomOptions & {
    secondsToAsk: number
    secondsToAnswer: number
}