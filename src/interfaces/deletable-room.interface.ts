export interface IDeletableRoom {
    checkActivity: () => boolean
    increaseFailedChecksCount: () => number
    delete: () => void
}