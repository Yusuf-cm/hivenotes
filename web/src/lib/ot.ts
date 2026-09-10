import { OTOperation } from '@/types'

export interface OTState {
  text: string
  version: number
  pendingOps: Array<{
    op: OTOperation
    clientVersion: number
  }>
}

export const createOTState = (initialText: string = '', initialVersion: number = 0): OTState => ({
  text: initialText,
  version: initialVersion,
  pendingOps: [],
})

// Apply a remote operation to local state
export const applyRemoteOp = (state: OTState, op: OTOperation, remoteVersion: number): OTState => {
  // If operation is old, ignore it
  if (remoteVersion <= state.version) {
    return state
  }

  // Apply operation to text
  let newText = state.text
  if (op.type === 'insert') {
    newText = newText.slice(0, op.index) + op.content + newText.slice(op.index)
  } else if (op.type === 'delete') {
    newText = newText.slice(0, op.index) + newText.slice(op.index + op.content.length)
  }

  return {
    text: newText,
    version: remoteVersion,
    pendingOps: state.pendingOps,
  }
}

// Create a local operation and add to pending queue
export const createLocalOp = (
  state: OTState,
  op: OTOperation
): OTState => {
  return {
    ...state,
    pendingOps: [
      ...state.pendingOps,
      {
        op,
        clientVersion: state.version + state.pendingOps.length,
      }
    ]
  }
}

// Mark that an operation was acknowledged by server
export const ackOp = (state: OTState): OTState => {
  const [, ...rest] = state.pendingOps
  return {
    ...state,
    pendingOps: rest,
  }
}

// Get the version number to send with next operation
export const getClientVersion = (state: OTState): number => {
  return state.version + state.pendingOps.length
}

// Apply operation to text (for local display)
export const applyOp = (text: string, op: OTOperation): string => {
  if (op.type === 'insert') {
    return text.slice(0, op.index) + op.content + text.slice(op.index)
  } else {
    return text.slice(0, op.index) + text.slice(op.index + op.content.length)
  }
}

// Helper to create insert operation
export const createInsertOp = (index: number, text: string): OTOperation => ({
  type: 'insert',
  index,
  content: text,
})

// Helper to create delete operation
export const createDeleteOp = (index: number, length: number, deletedText: string): OTOperation => ({
  type: 'delete',
  index,
  content: deletedText,
})
