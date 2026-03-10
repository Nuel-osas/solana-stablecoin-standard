# Operations Runbook

## Day-to-Day Operations

### Minting Tokens

```bash
# Add a minter with quota
sss-token minters add --address <MINTER_PUBKEY> --quota 10000000000

# Mint tokens
sss-token mint --to <RECIPIENT> --amount 1000000

# Check supply
sss-token supply
```

### Freezing Accounts

When you need to freeze a specific account (e.g., suspicious activity):

```bash
# Freeze the account
sss-token freeze --account <TOKEN_ACCOUNT>

# Verify it's frozen
sss-token status

# Thaw when resolved
sss-token thaw --account <TOKEN_ACCOUNT>
```

### Emergency Pause

If you need to halt all operations immediately:

```bash
# Pause everything
sss-token pause

# Verify paused
sss-token status

# Resume when resolved
sss-token unpause
```

## SSS-2 Compliance Operations

### OFAC/Sanctions Screening

When a match is found during sanctions screening:

```bash
# 1. Add to blacklist with reason
sss-token blacklist add --address <ADDRESS> --reason "OFAC SDN List match - [reference]"

# 2. Freeze their token account
sss-token freeze --account <TOKEN_ACCOUNT>

# 3. If required: seize tokens to treasury
sss-token seize --from <TOKEN_ACCOUNT> --to <TREASURY_ACCOUNT>
```

### Removing from Blacklist

After verification that the address is clear:

```bash
# 1. Remove from blacklist
sss-token blacklist remove --address <ADDRESS>

# 2. Thaw their account
sss-token thaw --account <TOKEN_ACCOUNT>
```

### Audit Trail

```bash
# View all compliance actions
sss-token audit-log

# Filter by action type
sss-token audit-log --action blacklist_add
sss-token audit-log --action seize
sss-token audit-log --action freeze
```

## Role Management

### Adding Operators

```bash
# Add a minter
sss-token minters add --address <PUBKEY> --quota 1000000000

# Add a pauser
# (done via program directly or SDK)
```

### Rotating Keys

```bash
# Transfer master authority
# This is irreversible — double check the new authority
sss-token transfer-authority --new-authority <NEW_PUBKEY>
```

## Monitoring

### Check Status

```bash
# Full status
sss-token status

# Supply info
sss-token supply

# List holders
sss-token holders
sss-token holders --min-balance 1000000
```
