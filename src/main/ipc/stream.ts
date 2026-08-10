import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import { startStream, stopStream } from '../media/streamTranscoder'

export function registerStreamIpc(): void {
  ipcMain.handle(IPC_CHANNELS.STREAM_START, (_event, streamId: string, sourceUrl: string) => {
    const playlistPath = startStream(streamId, sourceUrl)
    return { streamId, playlistPath }
  })

  ipcMain.on(IPC_CHANNELS.STREAM_STOP, (_event, streamId: string) => {
    stopStream(streamId)
  })
}
