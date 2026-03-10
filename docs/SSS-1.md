# SSS-1: Minimal Stablecoin Standard

## Overview

SSS-1 defines the minimal stablecoin — what's needed on every stable, nothing more. It provides mint authority, freeze authority, and metadata using Token-2022.

**Use cases**: Internal tokens, DAO treasuries, ecosystem settlement tokens, simple payment tokens.

## Specification

### Token Properties

| Property | Value |
|----------|-------|
| Token Standard | Token-2022 (SPL Token Extensions) |
| Extensions | Metadata Pointer |
| Mint Authority | Stablecoin PDA |
| Freeze Authority | Stablecoin PDA |
| Decimals | Configurable (default: 6) |

### Instructions

| Instruction | Description | Required Role |
|-------------|-------------|---------------|
| `initialize` | Create stablecoin with SSS-1 config | Signer (becomes master) |
| `mint_tokens` | Mint tokens to recipient | Minter |
| `burn_tokens` | Burn tokens | Burner |
| `freeze_account` | Freeze a token account | Pauser or Master |
| `thaw_account` | Thaw a frozen account | Pauser or Master |
| `pause` | Pause all operations | Pauser or Master |
| `unpause` | Resume operations | Pauser or Master |
| `assign_role` | Grant a role | Master |
| `revoke_role` | Remove a role | Master |
| `transfer_authority` | Transfer master authority | Master |
| `update_minter_quota` | Set minting limits | Master |

### Compliance Model

SSS-1 uses **reactive compliance**:
- Accounts can be frozen individually as needed
- Global pause halts all mint/burn operations
- No proactive transfer blocking
- No token seizure capability

This is appropriate when:
- The issuer trusts most holders
- Compliance actions are rare
- Transfer-level enforcement isn't required by regulation

### Initialization

```rust
StablecoinInitConfig {
    name: "My Stablecoin",
    symbol: "MUSD",
    uri: "https://...",
    decimals: 6,
    enable_permanent_delegate: false,
    enable_transfer_hook: false,
    default_account_frozen: false,
}
```

### Example Flow

```
1. Initialize SSS-1 stablecoin
2. Assign minter role to treasury operator
3. Mint tokens to users
4. If needed: freeze individual accounts
5. If emergency: pause all operations
```
