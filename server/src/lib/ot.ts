export interface Operation {
  type: 'insert' | 'delete'
  index: number
  content: string // For insert: text to insert. For delete: text being deleted (for verification)
  version: number
  userId: string
}

// Transform operation A against operation B
// Returns A' such that: apply(B then A') == apply(A then B')
export const transform = (opA: Operation, opB: Operation): Operation => {
  if (opA.type === 'insert' && opB.type === 'insert') {
    return transformInsertInsert(opA, opB)
  }
  if (opA.type === 'insert' && opB.type === 'delete') {
    return transformInsertDelete(opA, opB)
  }
  if (opA.type === 'delete' && opB.type === 'insert') {
    return transformDeleteInsert(opA, opB)
  }
  if (opA.type === 'delete' && opB.type === 'delete') {
    return transformDeleteDelete(opA, opB)
  }
  return opA
}

// Both insert at same position: use userId as tiebreaker (deterministic)
const transformInsertInsert = (opA: Operation, opB: Operation): Operation => {
  if (opA.index < opB.index) return opA
  if (opA.index > opB.index) {
    return {
      ...opA,
      index: opA.index + opB.content.length,
    }
  }
  // Same index: use userId to decide order (ensures deterministic behavior)
  if (opA.userId < opB.userId) {
    return opA
  } else {
    return {
      ...opA,
      index: opA.index + opB.content.length,
    }
  }
}

// A inserts, B deletes
const transformInsertDelete = (opA: Operation, opB: Operation): Operation => {
  const deleteEnd = opB.index + opB.content.length

  if (opA.index <= opB.index) {
    // Insert is before delete, no change
    return opA
  } else if (opA.index >= deleteEnd) {
    // Insert is after delete, shift left
    return {
      ...opA,
      index: opA.index - opB.content.length,
    }
  } else {
    // Insert is inside deleted range, move to start of delete
    return {
      ...opA,
      index: opB.index,
    }
  }
}

// A deletes, B inserts
const transformDeleteInsert = (opA: Operation, opB: Operation): Operation => {
  if (opB.index <= opA.index) {
    // Insert is before delete, shift delete right
    return {
      ...opA,
      index: opA.index + opB.content.length,
    }
  } else if (opB.index >= opA.index + opA.content.length) {
    // Insert is after delete, no change
    return opA
  } else {
    // Insert is inside deleted range, move delete end
    return {
      ...opA,
      content: opA.content.slice(0, opB.index - opA.index) +
               opB.content +
               opA.content.slice(opB.index - opA.index),
    }
  }
}

// Both delete: adjust for what was deleted before
const transformDeleteDelete = (opA: Operation, opB: Operation): Operation => {
  const aEnd = opA.index + opA.content.length
  const bEnd = opB.index + opB.content.length

  if (aEnd <= opB.index) {
    // A is before B, no change
    return opA
  } else if (opA.index >= bEnd) {
    // A is after B, shift left
    return {
      ...opA,
      index: opA.index - opB.content.length,
    }
  } else {
    // Overlapping deletes - tricky case
    if (opA.index <= opB.index && aEnd >= bEnd) {
      // A contains B's delete
      return {
        ...opA,
        content: opA.content.slice(0, opB.index - opA.index) +
                 opA.content.slice(bEnd - opA.index),
      }
    } else if (opB.index <= opA.index && bEnd >= aEnd) {
      // B contains A's delete, A is deleted
      return {
        ...opA,
        index: opB.index,
        content: '',
      }
    } else if (opA.index < opB.index) {
      // A starts before B starts
      return {
        ...opA,
        content: opA.content.slice(0, opB.index - opA.index),
      }
    } else {
      // B starts before A starts
      return {
        ...opA,
        index: opB.index,
        content: opA.content.slice(opB.index + opB.content.length - opA.index),
      }
    }
  }
}

// Apply operation to text
export const apply = (text: string, op: Operation): string => {
  if (op.type === 'insert') {
    return text.slice(0, op.index) + op.content + text.slice(op.index)
  } else {
    return text.slice(0, op.index) + text.slice(op.index + op.content.length)
  }
}
