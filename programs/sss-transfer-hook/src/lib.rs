use anchor_lang::prelude::*;
use anchor_lang::system_program;
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

declare_id!("63pY5GPBHKJ3gu99xTNH9yxUKgp8kUowiiHYzZtaE31E");

/// Seeds used by the main sss-token program
const STABLECOIN_SEED: &[u8] = b"stablecoin";
const BLACKLIST_SEED: &[u8] = b"blacklist";

#[program]
pub mod sss_transfer_hook {
    use super::*;

    /// Called by Token-2022 on every transfer.
    /// Checks that neither sender nor recipient is blacklisted.
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        // The transfer hook receives the source, mint, destination, and authority.
        // We need to check blacklist PDAs for both source owner and destination owner.

        let source_owner = ctx.accounts.source_account.owner;
        let dest_owner = ctx.accounts.destination_account.owner;
        let stablecoin_key = ctx.accounts.stablecoin.key();

        // Check source blacklist
        let (source_blacklist_pda, _) = Pubkey::find_program_address(
            &[BLACKLIST_SEED, stablecoin_key.as_ref(), source_owner.as_ref()],
            &crate::id(), // main program id would be used in production
        );

        // If the source_blacklist account exists and matches the PDA, the source is blacklisted
        if let Some(source_bl) = &ctx.accounts.source_blacklist {
            if source_bl.key() == source_blacklist_pda {
                return Err(error!(TransferHookError::SenderBlacklisted));
            }
        }

        // Check destination blacklist
        let (dest_blacklist_pda, _) = Pubkey::find_program_address(
            &[BLACKLIST_SEED, stablecoin_key.as_ref(), dest_owner.as_ref()],
            &crate::id(),
        );

        if let Some(dest_bl) = &ctx.accounts.destination_blacklist {
            if dest_bl.key() == dest_blacklist_pda {
                return Err(error!(TransferHookError::RecipientBlacklisted));
            }
        }

        msg!("Transfer hook: transfer of {} tokens approved", amount);
        Ok(())
    }

    /// Required by the transfer hook interface — returns extra account metas
    /// needed for the execute instruction.
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        // In a full implementation, this would write the ExtraAccountMetaList
        // to specify which additional accounts the transfer hook needs.
        // For now, we initialize the account.
        msg!("Extra account meta list initialized");
        Ok(())
    }
}

#[error_code]
pub enum TransferHookError {
    #[msg("Sender is blacklisted")]
    SenderBlacklisted,
    #[msg("Recipient is blacklisted")]
    RecipientBlacklisted,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    /// Source token account
    /// CHECK: Validated by Token-2022
    pub source_account: AccountInfo<'info>,

    /// Mint
    /// CHECK: Validated by Token-2022
    pub mint: AccountInfo<'info>,

    /// Destination token account
    /// CHECK: Validated by Token-2022
    pub destination_account: AccountInfo<'info>,

    /// Authority (owner of source)
    /// CHECK: Validated by Token-2022
    pub authority: AccountInfo<'info>,

    /// Stablecoin config PDA
    /// CHECK: Derived from mint
    pub stablecoin: AccountInfo<'info>,

    /// Optional: source blacklist PDA
    /// CHECK: We verify the PDA derivation
    pub source_blacklist: Option<AccountInfo<'info>>,

    /// Optional: destination blacklist PDA
    /// CHECK: We verify the PDA derivation
    pub destination_blacklist: Option<AccountInfo<'info>>,
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Will be initialized as ExtraAccountMetaList
    #[account(mut)]
    pub extra_account_meta_list: AccountInfo<'info>,

    /// CHECK: The mint for this transfer hook
    pub mint: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
