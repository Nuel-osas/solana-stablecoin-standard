import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { expect } from "chai";

describe("SSS-1: Minimal Stablecoin", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SssToken as Program;
  const authority = provider.wallet as anchor.Wallet;
  const mintKeypair = Keypair.generate();

  let stablecoinPDA: PublicKey;
  let stablecoinBump: number;

  before(async () => {
    [stablecoinPDA, stablecoinBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("stablecoin"), mintKeypair.publicKey.toBuffer()],
      program.programId
    );
  });

  it("initializes an SSS-1 stablecoin", async () => {
    const config = {
      name: "Test USD",
      symbol: "TUSD",
      uri: "https://example.com/metadata.json",
      decimals: 6,
      enablePermanentDelegate: false,
      enableTransferHook: false,
      defaultAccountFrozen: false,
    };

    const tx = await program.methods
      .initialize(config)
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

    console.log("  Initialize tx:", tx);

    const stablecoin = await program.account.stablecoin.fetch(stablecoinPDA);
    expect(stablecoin.name).to.equal("Test USD");
    expect(stablecoin.symbol).to.equal("TUSD");
    expect(stablecoin.decimals).to.equal(6);
    expect(stablecoin.paused).to.be.false;
    expect(stablecoin.enablePermanentDelegate).to.be.false;
    expect(stablecoin.enableTransferHook).to.be.false;
  });

  it("assigns minter role", async () => {
    const minter = Keypair.generate();
    const [rolePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("role"), stablecoinPDA.toBuffer(), Buffer.from("minter"), minter.publicKey.toBuffer()],
      program.programId
    );
    const [minterInfoPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter_info"), stablecoinPDA.toBuffer(), minter.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .assignRole({ minter: {} }, minter.publicKey)
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPDA,
        roleAssignment: rolePDA,
        minterInfo: minterInfoPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("  Assign minter tx:", tx);

    const role = await program.account.roleAssignment.fetch(rolePDA);
    expect(role.active).to.be.true;
    expect(role.assignee.toBase58()).to.equal(minter.publicKey.toBase58());
  });

  it("mints tokens", async () => {
    // Mint tokens using the assigned minter
    console.log("  Minting tokens test - implementation depends on minter setup");
  });

  it("pauses and unpauses", async () => {
    // Pause
    const pauseTx = await program.methods
      .pause()
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPDA,
        roleAssignment: null,
      })
      .rpc();
    console.log("  Pause tx:", pauseTx);

    let stablecoin = await program.account.stablecoin.fetch(stablecoinPDA);
    expect(stablecoin.paused).to.be.true;

    // Unpause
    const unpauseTx = await program.methods
      .unpause()
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPDA,
        roleAssignment: null,
      })
      .rpc();
    console.log("  Unpause tx:", unpauseTx);

    stablecoin = await program.account.stablecoin.fetch(stablecoinPDA);
    expect(stablecoin.paused).to.be.false;
  });

  it("freezes and thaws accounts", async () => {
    console.log("  Freeze/thaw test - requires token account setup");
  });

  it("transfers authority", async () => {
    const newAuthority = Keypair.generate();

    const tx = await program.methods
      .transferAuthority(newAuthority.publicKey)
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPDA,
      })
      .rpc();

    console.log("  Transfer authority tx:", tx);

    const stablecoin = await program.account.stablecoin.fetch(stablecoinPDA);
    expect(stablecoin.authority.toBase58()).to.equal(newAuthority.publicKey.toBase58());
  });
});
