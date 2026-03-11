# Confidential Transfer Proof

This directory contains evidence of **end-to-end confidential transfers on SSS-3 program-created mints** with full transfer hook + allowlist enforcement.

## How to Reproduce

```bash
# Prerequisites: Solana CLI 3.1.x, spl-token 5.x, cargo-build-sbf, anchor

# Full SSS-3 e2e: hook + allowlist + CT (14/14 checks):
bash scripts/test-ct-e2e.sh

# Standalone CT verification + anchor tests:
yarn test:ct
```

## What the Tests Prove

### Full End-to-End CT on SSS-3 Program Mint (14/14 checks)

**This is the key proof.** The test runs the complete SSS-3 flow with all features active:

1. **Builds Token-2022 v10** from source with zk-ops enabled
2. **Starts a localnet validator** loaded with Token-2022 v10 + SSS-3 programs
3. **Creates a full SSS-3 stablecoin via `init sss-3`** — transfer hook + allowlist + CT extension
4. **Auto-initializes the transfer hook** ExtraAccountMetaList PDA
5. **Verifies ConfidentialTransferMint extension** is present on the program-created mint
6. **Assigns minter role** via our program and **mints 1000 tokens**
7. **Adds sender to allowlist** (SSS-3 requirement)
8. **Configures CT** on sender and recipient token accounts (ElGamal keypair generation)
9. **Adds recipient to allowlist** (SSS-3 requirement)
10. **Deposits 100 tokens** into sender's encrypted confidential balance
11. **Confidential transfer 50 tokens** — ZK proofs generated client-side, verified on-chain, **transfer hook enforces allowlist during CT**
12. **Withdraws 25 tokens** from recipient's confidential balance to public balance
13. **Verifies final balances** — Sender: 900 public, Recipient: 25 public

### Key Technical Insights

**ABI Stability:** SPL Token-2022 instruction formats are ABI-stable across versions. Our Anchor program uses `spl-token-2022 v6` for CPI calls, but these work correctly against the v10 Token-2022 runtime on the validator.

**Transfer Hook + CT Integration:** The transfer hook's `execute` function is invoked by Token-2022 during confidential transfers. This required a `fallback` handler in the Anchor program because Token-2022 uses the spl-transfer-hook-interface discriminator (not Anchor's). The fallback handles the account layout difference (Token-2022 injects the `extra_account_meta_list` PDA at index 4).

**Allowlist Enforcement During CT:** The transfer hook verifies both sender and recipient are on the allowlist even during confidential transfers, proving that SSS-3's compliance layer works alongside ZK privacy.

### Mainnet Status
On mainnet, CT is currently blocked by the ZK ElGamal Proof program being disabled (pending security audit). Once enabled, SSS-3 stablecoins will support confidential transfers with no changes.

## Log Files
- `evidence/ct-localnet-proof.log` — Standalone CT verification output
- `evidence/ct-e2e-proof.log` — Full e2e output (14/14 checks passed)
