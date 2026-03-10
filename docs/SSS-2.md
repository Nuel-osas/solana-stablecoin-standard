# SSS-2: Compliant Stablecoin Standard

## Overview

SSS-2 defines the compliant stablecoin — SSS-1 plus permanent delegate, transfer hook, and blacklist enforcement. This is the USDC/USDT-class standard where regulators expect on-chain compliance enforcement.

**Use cases**: Regulated stablecoins, institutional tokens, GENIUS Act compliant tokens, cross-border payment tokens.

## Specification

### Token Properties

| Property | Value |
|----------|-------|
| Token Standard | Token-2022 (SPL Token Extensions) |
| Extensions | Metadata Pointer, Permanent Delegate, Transfer Hook, (optional) Default Account State |
| Mint Authority | Stablecoin PDA |
| Freeze Authority | Stablecoin PDA |
| Permanent Delegate | Stablecoin PDA |
| Transfer Hook | SSS Transfer Hook Program |

### Additional Instructions (Beyond SSS-1)

| Instruction | Description | Required Role |
|-------------|-------------|---------------|
| `add_to_blacklist` | Add address to blacklist | Blacklister |
| `remove_from_blacklist` | Remove from blacklist | Blacklister |
| `seize` | Seize tokens via permanent delegate | Seizer |

### Compliance Model

SSS-2 uses **proactive compliance**:
- Transfer hook checks blacklist on **every transfer** — no gaps
- Blacklisted addresses cannot send or receive tokens
- Permanent delegate allows token seizure from blacklisted accounts
- Blacklist entries include reason and audit trail

### Transfer Hook Flow

```
Every Token-2022 Transfer:
  1. Token-2022 invokes transfer hook
  2. Hook derives blacklist PDAs for sender and recipient
  3. If either PDA exists → transfer REJECTED
  4. If neither exists → transfer APPROVED
```

This enforcement happens at the Token-2022 level, meaning:
- Direct SPL transfers are checked (not just program calls)
- DEX swaps are checked
- No way to bypass without removing the transfer hook (impossible after init)

### Permanent Delegate

The permanent delegate is the Stablecoin PDA. It can:
- Transfer tokens from any account (used for seizure)
- Only the Seizer role can invoke this through the program
- Seizure requires the target to be blacklisted first

### Seizure Flow

```
1. Blacklister adds address to blacklist (with reason)
2. Account is frozen (optional but recommended)
3. Seizer invokes seize instruction
4. PDA transfers all tokens to treasury via permanent delegate
5. Event emitted with full audit trail
```

### Initialization

```rust
StablecoinInitConfig {
    name: "Regulated USD",
    symbol: "RUSD",
    uri: "https://...",
    decimals: 6,
    enable_permanent_delegate: true,
    enable_transfer_hook: true,
    default_account_frozen: false, // optional: freeze new accounts by default
}
```

### Regulatory Considerations

SSS-2 is designed to satisfy:
- **OFAC compliance**: Blacklist enforcement prevents sanctioned addresses from transacting
- **GENIUS Act**: On-chain seizure capabilities for law enforcement cooperation
- **Travel Rule**: Audit trail of all compliance actions
- **AML/KYC**: Can be paired with off-chain identity verification

### Comparison with SSS-1

| Feature | SSS-1 | SSS-2 |
|---------|-------|-------|
| Mint/Burn | ✓ | ✓ |
| Freeze/Thaw | ✓ | ✓ |
| Pause/Unpause | ✓ | ✓ |
| Transfer Hook | | ✓ |
| Blacklist | | ✓ |
| Permanent Delegate | | ✓ |
| Token Seizure | | ✓ |
| Compliance approach | Reactive | Proactive |
