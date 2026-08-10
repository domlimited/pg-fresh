import type { Layer } from './scene'

export interface Preset {
  id: string
  name: string
  slot: number
  layers: Layer[]
  createdAt: number
}
