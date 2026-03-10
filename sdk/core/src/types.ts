import { PublicKey, Keypair } from "@solana/web3.js";

export type RoleType = "minter" | "burner" | "blacklister" | "pauser" | "seizer";

export interface StablecoinConfig {
  preset?: "SSS_1" | "SSS_2";
  name: string;
  symbol: string;
  uri?: string;
  decimals?: number;
  authority: Keypair;
  extensions?: {
    permanentDelegate?: boolean;
    transferHook?: boolean;
    defaultAccountFrozen?: boolean;
  };
}

export interface StablecoinState {
  authority: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  paused: boolean;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
  totalMinted: bigint;
  totalBurned: bigint;
}

export interface MintParams {
  recipient: PublicKey;
  amount: number | bigint;
  minter: Keypair;
}

export interface BlacklistParams {
  address: PublicKey;
  reason: string;
  blacklister: Keypair;
}

export interface SeizeParams {
  frozenAccount: PublicKey;
  treasury: PublicKey;
  seizer: Keypair;
}
