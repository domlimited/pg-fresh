export interface DisplayInfo {
  id: number
  label: string
  width: number
  height: number
  isPrimary: boolean
}

export interface OutputStatus {
  active: boolean
  displayId: number | null
}
