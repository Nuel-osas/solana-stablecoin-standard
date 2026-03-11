import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Authority Management", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SssToken as Program;
  const authority = provider.wallet as anchor.Wallet;
  const mintKeypair = Keypair.generate();
  const newAuthority = Keypair.generate();
  const randomUser = Keypair.generate();

  let stablecoinPDA: PublicKey;

  before(async () => {
    [stablecoinPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stablecoin"), mintKeypair.publicKey.toBuffer()],
      program.programId
    );

    // Fund accounts
    const fundTx = new anchor.web3.Transaction();
    for (const kp of [newAuthority, randomUser]) {
      fundTx.add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: kp.publicKey,
          lamports: LAMPORTS_PER_SOL,
        })
      );
    }
    await provider.sendAndConfirm(fundTx);

    // Initialize stablecoin
    await program.methods
      .initialize({
        name: "Auth Test USD",
        symbol: "ATUSD",
        uri: "",
        decimals: 6,
        enablePermanentDelegate: false,
        enableTransferHook: false,
        defaultAccountFrozen: false,
        enableAllowlist: false,
        supplyCap: null,
      })
      .accounts({
        authority: authority.publicKey,
        mint: mintKeypair.publicKey,
        stablecoin: stablecoinPDA,
        transferHookProgram: null,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();
  });

  it("nominates a new authority", async () => {
    const tx = await program.methods
      .nominateAuthority(newAuthority.publicKey)
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPDA,
      })
      .rpc();

    console.log("  Nominate authority tx:", tx);

    const stablecoin = await program.account.stablecoin.fetch(stablecoinPDA);
    expect(stablecoin.pendingAuthority.toBase58()).to.equal(newAuthority.publicKey.toBase58());
    // Original authority unchanged
    expect(stablecoin.authority.toBase58()).to.equal(authority.publicKey.toBase58());
  });

  it("rejects accept_authority from wrong address", async () => {
    try {
      await program.methods
        .acceptAuthority()
        .accounts({
          newAuthority: randomUser.publicKey,
          stablecoin: stablecoinPDA,
        })
        .signers([randomUser])
        .rpc();
      expect.fail("Should have thrown NotPendingAuthority");
    } catch (err: any) {
      expect(err.toString()).to.contain("NotPendingAuthority");
    }
  });

  it("accepts authority nomination (completes two-step transfer)", async () => {
    const tx = await program.methods
      .acceptAuthority()
      .accounts({
        newAuthority: newAuthority.publicKey,
        stablecoin: stablecoinPDA,
      })
      .signers([newAuthority])
      .rpc();

    console.log("  Accept authority tx:", tx);

    const stablecoin = await program.account.stablecoin.fetch(stablecoinPDA);
    expect(stablecoin.authority.toBase58()).to.equal(newAuthority.publicKey.toBase58());
    expect(stablecoin.pendingAuthority.toBase58()).to.equal(PublicKey.default.toBase58());
  });

  it("rejects accept_authority when no pending authority", async () => {
    try {
      await program.methods
        .acceptAuthority()
        .accounts({
          newAuthority: randomUser.publicKey,
          stablecoin: stablecoinPDA,
        })
        .signers([randomUser])
        .rpc();
      expect.fail("Should have thrown NoPendingAuthority");
    } catch (err: any) {
      expect(err.toString()).to.contain("NoPendingAuthority");
    }
  });

  it("rejects nominate_authority from non-authority", async () => {
    try {
      await program.methods
        .nominateAuthority(randomUser.publicKey)
        .accounts({
          authority: randomUser.publicKey,
          stablecoin: stablecoinPDA,
        })
        .signers([randomUser])
        .rpc();
      expect.fail("Should have thrown Unauthorized");
    } catch (err: any) {
      expect(err.toString()).to.contain("Unauthorized");
    }
  });

  it("old authority cannot act after transfer", async () => {
    try {
      await program.methods
        .nominateAuthority(authority.publicKey)
        .accounts({
          authority: authority.publicKey,
          stablecoin: stablecoinPDA,
        })
        .rpc();
      expect.fail("Should have thrown Unauthorized");
    } catch (err: any) {
      expect(err.toString()).to.contain("Unauthorized");
    }
  });

  it("direct transfer_authority clears pending nomination", async () => {
    // New authority nominates someone first
    await program.methods
      .nominateAuthority(randomUser.publicKey)
      .accounts({
        authority: newAuthority.publicKey,
        stablecoin: stablecoinPDA,
      })
      .signers([newAuthority])
      .rpc();

    let stablecoin = await program.account.stablecoin.fetch(stablecoinPDA);
    expect(stablecoin.pendingAuthority.toBase58()).to.equal(randomUser.publicKey.toBase58());

    // Now do direct transfer — should clear pending
    await program.methods
      .transferAuthority(authority.publicKey)
      .accounts({
        authority: newAuthority.publicKey,
        stablecoin: stablecoinPDA,
      })
      .signers([newAuthority])
      .rpc();

    stablecoin = await program.account.stablecoin.fetch(stablecoinPDA);
    expect(stablecoin.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(stablecoin.pendingAuthority.toBase58()).to.equal(PublicKey.default.toBase58());
  });
});
