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
  // True while the operator has manually tucked the real Output window away
  // (see setOutputHidden()) — the LED feed is still active, just not shown
  // to the operator right now. Independent from `active`.
  hidden: boolean
}
