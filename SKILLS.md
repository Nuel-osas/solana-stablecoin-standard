# SSS Token CLI — AI Agent Reference

This document is an AI-readable reference for the `sss-token` CLI. Use it to understand and operate Solana Stablecoin Standard tokens.

## Installation

The CLI is available as `sss-token` (global binary via `npm link`) or `yarn cli` (workspace script). Both are equivalent.

## Global Options

All commands that interact with on-chain state accept:
- `--cluster <cluster>` — Solana cluster: `devnet`, `mainnet-beta`, `localnet`, or a full URL (default: `devnet`)
- `--keypair <path>` — Path to signer keypair JSON (default: `~/.config/solana/id.json`)

## Presets

| Preset | Description |
|--------|-------------|
| SSS-1  | Minimal stablecoin — mint/freeze/metadata only |
| SSS-2  | Compliant stablecoin — adds permanent delegate, transfer hook, blacklist enforcement |
| SSS-3  | Private stablecoin — adds allowlist-gated transfers, confidential transfer extension |

## Commands

### Initialize

```bash
# Create a new stablecoin
sss-token init sss-1 --name "My Token" --symbol "MTK" [--decimals 6] [--uri "https://..."]
sss-token init sss-2 --name "My Token" --symbol "MTK" [--decimals 6] [--uri "https://..."]
sss-token init sss-3 --name "My Token" --symbol "MTK" [--decimals 6] [--uri "https://..."]
sss-token init custom --config <path.json|path.toml>
```

### Token Operations

All amounts are human-readable (e.g., `1000` = 1000 tokens, not raw lamports).

```bash
# Mint tokens to a recipient
sss-token mint --to <wallet_address> --amount <number> --mint <mint_address>

# Burn tokens
sss-token burn --amount <number> --mint <mint_address> [--from <token_account>]

# Transfer tokens (required for SSS-2/SSS-3 — wallets cannot resolve transfer hooks)
sss-token transfer --to <wallet_address> --amount <number> --mint <mint_address>

# Freeze / thaw a token account
sss-token freeze --account <token_account> --mint <mint_address>
sss-token thaw --account <token_account> --mint <mint_address>

# Pause / unpause all operations globally
sss-token pause --mint <mint_address>
sss-token unpause --mint <mint_address>
```

### Read-Only Queries

```bash
# Full stablecoin status (name, symbol, preset, supply, extensions, URI, authority)
sss-token status --mint <mint_address>

# Total supply only
sss-token supply --mint <mint_address>

# List token holders
sss-token holders --mint <mint_address> [--min-balance <amount>]

# View recent on-chain activity
sss-token audit-log --mint <mint_address> [--action <type>] [--limit <count>]
```

### Role Management

Roles: `minter`, `burner`, `blacklister`, `pauser`, `seizer`

```bash
# Assign a role
sss-token roles assign --role <role> --address <wallet_address> --mint <mint_address>

# Revoke a role
sss-token roles revoke --role <role> --address <wallet_address> --mint <mint_address>

# List all role assignments
sss-token roles list --mint <mint_address> [--role <role>]

# Check what roles a specific address has
sss-token roles check --address <wallet_address> --mint <mint_address>
```

### Compliance (SSS-2)

```bash
# Add to blacklist (blocks all transfers to/from this address)
sss-token blacklist add --address <wallet_address> --mint <mint_address> [--reason "OFAC match"]

# Remove from blacklist
sss-token blacklist remove --address <wallet_address> --mint <mint_address>

# Seize tokens from a blacklisted account via permanent delegate
# --from is the blacklisted user's TOKEN ACCOUNT (ATA), not their wallet
# --to is the treasury TOKEN ACCOUNT (ATA) that receives the seized tokens
sss-token seize --from <source_token_account> --to <treasury_token_account> --mint <mint_address>
```

To find a wallet's token account (ATA):
```bash
spl-token address --verbose --token <mint_address> --owner <wallet_address> --url devnet
```

### Allowlist (SSS-3)

```bash
# Add address to allowlist (required for SSS-3 transfers)
sss-token allowlist add --address <wallet_address> --mint <mint_address>

# Remove from allowlist
sss-token allowlist remove --address <wallet_address> --mint <mint_address>
```

### Minter Management

```bash
# Add a minter (with optional quota)
sss-token minters add --address <wallet_address> --mint <mint_address> [--quota <tokens>]

# Remove a minter
sss-token minters remove --address <wallet_address> --mint <mint_address>

# List all minters
sss-token minters list --mint <mint_address>

# Update a minter's quota (in tokens, 0 = unlimited)
sss-token update-minter-quota --address <wallet_address> --quota <tokens> --mint <mint_address>
```

### Supply Cap

```bash
# Set supply cap (raw amount, 0 = unlimited)
sss-token set-supply-cap --cap <amount> --mint <mint_address>
```

### Authority Transfer

```bash
# Two-step transfer (recommended — prevents typo loss)
sss-token nominate-authority --new-authority <wallet_address> --mint <mint_address>
sss-token accept-authority --mint <mint_address> --keypair <new_authority_keypair>

# Single-step transfer (use with caution)
sss-token transfer-authority --new-authority <wallet_address> --mint <mint_address>
```

### Metadata

```bash
# Update the metadata URI (name and symbol are immutable)
sss-token update-metadata --mint <mint_address> --uri "https://..."
```

### Oracle (Pyth Price Enforcement)

```bash
# Configure on-chain oracle for mint/burn price validation
sss-token configure-oracle --mint <mint_address> --price-feed <pyth_account> [--max-deviation <bps>] [--max-staleness <secs>]

# Disable oracle enforcement
sss-token configure-oracle --mint <mint_address> --price-feed <pyth_account> --disable

# One-shot price fetch
sss-token price --feed <name|hex_id>   # e.g., --feed usdc

# Continuous peg monitoring with alerts
sss-token peg-monitor --feed <name|hex_id> [--interval <secs>] [--threshold <percent>]
```

## Typical Workflows

### Deploy and operate an SSS-2 stablecoin

```bash
# 1. Create the stablecoin
sss-token init sss-2 --name "Regulated USD" --symbol "RUSD"
# (outputs mint address)

# 2. Assign roles
sss-token roles assign --role minter --address <minter_wallet> --mint <mint>
sss-token roles assign --role blacklister --address <compliance_wallet> --mint <mint>
sss-token roles assign --role seizer --address <compliance_wallet> --mint <mint>

# 3. Set minter quota
sss-token update-minter-quota --address <minter_wallet> --quota 100000 --mint <mint>

# 4. Mint tokens
sss-token mint --to <recipient> --amount 1000 --mint <mint>

# 5. Check status
sss-token status --mint <mint>
```

### OFAC freeze and seize workflow

```bash
# 1. Blacklist the sanctioned address
sss-token blacklist add --address <sanctioned_wallet> --reason "OFAC SDN match" --mint <mint>

# 2. Find their token account
spl-token address --verbose --token <mint> --owner <sanctioned_wallet> --url devnet

# 3. Seize tokens to treasury
sss-token seize --from <their_token_account> --to <treasury_token_account> --mint <mint>
```

## Program IDs (Devnet)

- `sss_token`: `BXG5KG57ef5vgZdA4mWjBYfrFPyaaZEvdHCmGsuj7vbq`
- `sss_transfer_hook`: `B9HzG9fuxbuJBG2wTSP6UmxBSQLdaUAk62Kcdf41WxAt`

## Notes

- All token amounts in commands are human-readable (e.g., `--amount 100` = 100 tokens)
- The `set-supply-cap` command currently takes raw amounts (multiply by 10^decimals)
- SSS-2/SSS-3 tokens require the CLI, SDK, or frontend for transfers — wallets like Phantom cannot resolve transfer hook accounts
- The default keypair is `~/.config/solana/id.json` (Solana CLI default)
- The default cluster is `devnet`
