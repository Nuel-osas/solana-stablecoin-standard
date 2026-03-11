# Operations Runbook

> All CLI commands use `yarn cli -- <command>`. See `yarn cli -- --help` for the full list.

## Day-to-Day Operations

### Minting Tokens

```bash
# Add a minter with quota
yarn cli -- minters add --address <MINTER_PUBKEY> --quota 10000000000

# Mint tokens
yarn cli -- mint --to <RECIPIENT> --amount 1000000

# Check supply
yarn cli -- supply
```

### Freezing Accounts

When you need to freeze a specific account (e.g., suspicious activity):

```bash
# Freeze the account
yarn cli -- freeze --account <TOKEN_ACCOUNT>

# Verify it's frozen
yarn cli -- status

# Thaw when resolved
yarn cli -- thaw --account <TOKEN_ACCOUNT>
```

### Emergency Pause

If you need to halt all operations immediately:

```bash
# Pause everything
yarn cli -- pause

# Verify paused
yarn cli -- status

# Resume when resolved
yarn cli -- unpause
```

## SSS-2 Compliance Operations

### OFAC/Sanctions Screening

When a match is found during sanctions screening:

```bash
# 1. Add to blacklist with reason
yarn cli -- blacklist add --address <ADDRESS> --reason "OFAC SDN List match - [reference]"

# 2. Freeze their token account
yarn cli -- freeze --account <TOKEN_ACCOUNT>

# 3. If required: seize tokens to treasury
yarn cli -- seize --from <TOKEN_ACCOUNT> --to <TREASURY_ACCOUNT>
```

### Removing from Blacklist

After verification that the address is clear:

```bash
# 1. Remove from blacklist
yarn cli -- blacklist remove --address <ADDRESS>

# 2. Thaw their account
yarn cli -- thaw --account <TOKEN_ACCOUNT>
```

### Audit Trail

```bash
# View all compliance actions
yarn cli -- audit-log

# Filter by action type
yarn cli -- audit-log --action blacklist_add
yarn cli -- audit-log --action seize
yarn cli -- audit-log --action freeze
```

## Role Management

### Adding Operators

```bash
# Add a minter
yarn cli -- minters add --address <PUBKEY> --quota 1000000000

# Add a pauser
# (done via program directly or SDK)
```

### Rotating Keys

Two-step authority transfer prevents loss from typos (inspired by Circle FiatToken v2):

```bash
# Step 1: Current authority nominates the new authority
yarn cli -- nominate-authority --new-authority <NEW_PUBKEY> --mint <MINT>

# Step 2: New authority accepts (must sign with the nominated key)
yarn cli -- accept-authority --mint <MINT>
```

### Supply Cap

```bash
# Set a supply cap (enforced on every mint)
yarn cli -- set-supply-cap --cap 1000000000 --mint <MINT>

# Remove supply cap (set to 0 = unlimited)
yarn cli -- set-supply-cap --cap 0 --mint <MINT>
```

## Monitoring

### Check Status

```bash
# Full status
yarn cli -- status

# Supply info
yarn cli -- supply

# List holders
yarn cli -- holders
yarn cli -- holders --min-balance 1000000
```
