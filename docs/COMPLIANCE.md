# Compliance Guide

## Overview

The Solana Stablecoin Standard provides two compliance models:

- **SSS-1 (Reactive)**: Freeze accounts as needed. No proactive transfer blocking.
- **SSS-2 (Proactive)**: Blacklist enforcement on every transfer. Token seizure capability.

## Regulatory Framework

### OFAC Compliance

SSS-2's blacklist module directly supports OFAC compliance:

1. **SDN List Screening**: Off-chain process screens addresses against OFAC SDN List
2. **On-chain Enforcement**: Matched addresses are added to the on-chain blacklist
3. **Transfer Blocking**: Transfer hook prevents all transfers to/from blacklisted addresses
4. **No Gaps**: Enforcement at Token-2022 level means no bypass is possible

### GENIUS Act

The GENIUS Act requires stablecoin issuers to:
- Maintain reserves (off-chain)
- Cooperate with law enforcement (SSS-2 seizure capability)
- Implement sanctions compliance (SSS-2 blacklist)
- Maintain audit trails (on-chain events)

### Travel Rule

All compliance actions emit events that create an immutable on-chain audit trail:
- `BlacklistAdded { address, reason, timestamp, by }`
- `BlacklistRemoved { address, timestamp, by }`
- `TokensSeized { from, to, amount, timestamp, by }`
- `AccountFrozen { account, timestamp, by }`

## Audit Trail Format

Every compliance action emits an Anchor event that is:
1. Stored in the transaction log (permanent)
2. Indexed by standard Solana explorers
3. Queryable via the backend event listener service

### Event Schema

```json
{
  "event": "BlacklistAdded",
  "data": {
    "mint": "...",
    "address": "...",
    "reason": "OFAC SDN List match - ref:12345",
    "by": "...",
    "timestamp": 1710000000
  },
  "transaction": "...",
  "slot": 12345678
}
```

## Integration Points

### Sanctions Screening Service

The backend provides an integration point for sanctions screening:

```
Off-chain Screening → Backend API → On-chain Blacklist
     (Chainalysis,       (REST)       (Anchor Program)
      Elliptic, etc.)
```

The backend does NOT perform screening itself — it provides the bridge between off-chain compliance systems and on-chain enforcement.

### Webhook Notifications

Configure webhooks for compliance events:

```json
{
  "events": ["blacklist_add", "blacklist_remove", "seize", "freeze"],
  "url": "https://your-compliance-system.com/webhook",
  "retry": { "maxRetries": 3, "backoffMs": 1000 }
}
```

## Security Considerations

### Role Separation Prevents Abuse

- **Blacklister** can add to blacklist but cannot seize tokens
- **Seizer** can seize from blacklisted accounts but cannot blacklist
- This requires collusion between two separate roles for abuse

### Immutable Configuration

Compliance configuration (permanent delegate, transfer hook) is set at initialization and cannot be changed. This prevents:
- Retroactive addition of seizure capabilities
- Disabling transfer hook enforcement after launch

### Blacklist Entry Accountability

Every blacklist entry records:
- Who added it (`blacklisted_by`)
- When it was added (`blacklisted_at`)
- Why it was added (`reason`)

This creates accountability for compliance actions.
