# Operational Transformation (OT) Implementation

This document explains how Operational Transformation works in HiveNotes for collaborative page editing.

## Problem

When multiple users edit the same page simultaneously, we need to resolve conflicts without losing data. Example:

```
User A: "Hello" → Insert "World" at index 5 → "HelloWorld"
User B: "Hello" → Insert "!" at index 5 → "Hello!"

Without OT, results depend on execution order:
- A then B: "HelloWorld!" 
- B then A: "Hello!World"
```

With OT, both users end up with the same result: "HelloWorld!"

## How It Works

### 1. Operations

Each edit is represented as an operation:
- **Insert**: `{ type: 'insert', index: 5, content: 'World' }`
- **Delete**: `{ type: 'delete', index: 0, content: 'He' }`

### 2. Versioning

Each page has a version number:
- Server tracks: Current version after all committed ops
- Client tracks: Version of last committed op
- When client sends op, it includes its current version

### 3. Transformation Algorithm

When two operations happen concurrently:
1. Client A sends op with version N
2. Client B sends op with version N
3. Server receives A first, applies it (version N+1)
4. Server receives B, **transforms it** against A
5. Server applies transformed B (version N+2)

**Key property**: `apply(B then transform(A, B)) == apply(A then transform(B, A))`

### 4. Transformation Rules

```typescript
// Insert vs Insert
A inserts at 5, B inserts at 5 → Use userId to break tie deterministically

// Insert vs Delete  
A inserts at 3, B deletes [5-8] → A shifts if after delete, or stays if before

// Delete vs Delete
Both delete overlapping ranges → Carefully adjust positions so both operations still apply correctly
```

## Message Flow

```
Client A                    Server                    Client B
   |                          |                          |
   |-- page:edit v=0 -------->|                          |
   |<-- page:edited v=1 ------|-- page:edited v=1 ----->|
   |                          |                          |
   |                  page:edit v=0 (from B)             |
   |                  Transform against v=1              |
   |                  Apply transformed op (v=2)         |
   |                          |                          |
   |<-- page:edited v=2 ------|-- page:edited v=2 ----->|
```

## Server State

- `Page` table: Current text, version number
- `PageOperation` table: History of all operations with their version
  - Allows recovery of any past state
  - Allows transforming late-arriving operations

## Client State (useOTPages hook)

```typescript
OTState {
  text: string              // Current local text
  version: number           // Last server version received
  pendingOps: Operation[]   // Operations sent but not ack'd
}
```

When sending op at local version N with M pending ops:
- Actual server version = N + M (accounting for pending ops)

## Limitations & Future Work

1. **Large ops**: If operation content > 5000 chars, rejected
2. **Version sync**: If client falls behind, operations after their version are silently dropped
3. **Conflict resolution**: Deterministic but may not match user intent (use userId as tiebreaker)
4. **Rich text**: Current impl works on plaintext; supporting rich text (bold, links) is complex
5. **Offline support**: Not yet supported (would need hybrid CRDT)

## Testing

To test concurrent edits:

1. Open same page in two browsers
2. Both type at the same time
3. Server should merge changes correctly
4. Both clients should converge to same text

Example:
- Browser A types "Hello"
- Browser B types "World" at the same time
- Final result in both: text contains both "Hello" and "World" in merged order

## References

- Google Docs uses OT for real-time collaboration
- See CRDT approach (Yjs, Automerge) for alternative with offline support
- ShareDB is popular OT library for Node.js
