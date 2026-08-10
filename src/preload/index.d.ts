import { ElectronAPI } from '@electron-toolkit/preload'
import type { FreshAPI } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    fresh: FreshAPI
  }
}
