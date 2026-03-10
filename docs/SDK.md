# SDK Reference

## Installation

```bash
yarn add @stbr/sss-token
```

## Presets

### SSS-1 (Minimal)

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_1,
  name: "Simple USD",
  symbol: "SUSD",
  decimals: 6,
  authority: adminKeypair,
});
```

### SSS-2 (Compliant)

```typescript
const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "Compliant USD",
  symbol: "CUSD",
  decimals: 6,
  authority: adminKeypair,
});
```

### Custom Configuration

```typescript
const stable = await SolanaStablecoin.create(connection, {
  name: "Custom Token",
  symbol: "CTOK",
  decimals: 6,
  authority: adminKeypair,
  extensions: {
    permanentDelegate: true,
    transferHook: false,
    defaultAccountFrozen: true,
  },
});
```

## Core Operations

### Mint

```typescript
await stable.mint({
  recipient: userPublicKey,
  amount: 1_000_000, // 1 token with 6 decimals
  minter: minterKeypair,
});
```

### Burn

```typescript
await stable.burn({
  amount: 500_000,
  burner: burnerKeypair,
  from: tokenAccountPublicKey,
});
```

### Freeze / Thaw

```typescript
await stable.freezeAccount({
  account: tokenAccountPublicKey,
  authority: pauserKeypair,
});

await stable.thawAccount({
  account: tokenAccountPublicKey,
  authority: pauserKeypair,
});
```

### Pause / Unpause

```typescript
await stable.pause(pauserKeypair);
await stable.unpause(pauserKeypair);
```

### Role Management

```typescript
await stable.assignRole({
  role: "minter",
  assignee: minterPublicKey,
  authority: masterKeypair,
});

await stable.revokeRole({
  role: "minter",
  assignee: minterPublicKey,
  authority: masterKeypair,
});
```

## Compliance Module (SSS-2)

### Blacklist

```typescript
// Add to blacklist
await stable.compliance.blacklistAdd(
  addressPublicKey,
  "OFAC sanctions match"
);

// Check if blacklisted
const isBlacklisted = await stable.compliance.isBlacklisted(addressPublicKey);

// Get blacklist entry details
const entry = await stable.compliance.getBlacklistEntry(addressPublicKey);
// { address, reason, blacklistedAt, blacklistedBy }

// Remove from blacklist
await stable.compliance.blacklistRemove(addressPublicKey);
```

### Seize

```typescript
await stable.compliance.seize(
  frozenAccountPublicKey,
  treasuryPublicKey
);
```

## Query Functions

```typescript
// Total supply
const supply = await stable.getTotalSupply();

// Stablecoin state
const state = await stable.getState();
// { authority, mint, name, symbol, decimals, paused, ... }
```

## PDA Helpers

```typescript
import { findStablecoinPDA, findRolePDA, findBlacklistPDA, findMinterInfoPDA } from "@stbr/sss-token";

const [stablecoinPDA, bump] = findStablecoinPDA(mintPublicKey, programId);
const [rolePDA] = findRolePDA(stablecoinPDA, "minter", assigneePublicKey, programId);
const [blacklistPDA] = findBlacklistPDA(stablecoinPDA, addressPublicKey, programId);
const [minterInfoPDA] = findMinterInfoPDA(stablecoinPDA, minterPublicKey, programId);
```
