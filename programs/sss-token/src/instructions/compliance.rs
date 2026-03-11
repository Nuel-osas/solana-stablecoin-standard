use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::error::SSSError;
use crate::events;
use crate::state::*;

pub fn add_to_blacklist_handler(
    ctx: Context<BlacklistAdd>,
    address: Pubkey,
    reason: String,
) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(stablecoin.is_compliance_enabled(), SSSError::ComplianceNotEnabled);
    require!(reason.len() <= MAX_REASON_LEN, SSSError::ReasonTooLong);

    // Verify blacklister role or master authority
    let is_master = ctx.accounts.blacklister.key() == stablecoin.authority;
    let is_blacklister = ctx.accounts.role_assignment.as_ref()
        .map(|r| r.active && r.role == Role::Blacklister && r.assignee == ctx.accounts.blacklister.key())
        .unwrap_or(false);
    require!(is_master || is_blacklister, SSSError::Unauthorized);

    let blacklist_entry = &mut ctx.accounts.blacklist_entry;
    blacklist_entry.stablecoin = stablecoin.key();
    blacklist_entry.address = address;
    blacklist_entry.reason = reason.clone();
    blacklist_entry.blacklisted_at = Clock::get()?.unix_timestamp;
    blacklist_entry.blacklisted_by = ctx.accounts.blacklister.key();
    blacklist_entry.active = true;
    blacklist_entry.bump = ctx.bumps.blacklist_entry;

    emit!(events::BlacklistAdded {
        mint: stablecoin.mint,
        address,
        reason,
        by: ctx.accounts.blacklister.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

pub fn remove_from_blacklist_handler(
    ctx: Context<BlacklistRemove>,
    _address: Pubkey,
) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(stablecoin.is_compliance_enabled(), SSSError::ComplianceNotEnabled);

    // Verify blacklister role or master authority
    let is_master = ctx.accounts.blacklister.key() == stablecoin.authority;
    let is_blacklister = ctx.accounts.role_assignment.as_ref()
        .map(|r| r.active && r.role == Role::Blacklister && r.assignee == ctx.accounts.blacklister.key())
        .unwrap_or(false);
    require!(is_master || is_blacklister, SSSError::Unauthorized);

    let blacklist_entry = &mut ctx.accounts.blacklist_entry;
    require!(blacklist_entry.active, SSSError::NotBlacklisted);
    blacklist_entry.active = false;

    emit!(events::BlacklistRemoved {
        mint: stablecoin.mint,
        address: blacklist_entry.address,
        by: ctx.accounts.blacklister.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

pub fn seize_handler(ctx: Context<Seize>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(!stablecoin.paused, SSSError::Paused);
    require!(stablecoin.enable_permanent_delegate, SSSError::ComplianceNotEnabled);

    // Verify seizer role or master authority
    let is_master = ctx.accounts.seizer.key() == stablecoin.authority;
    let is_seizer = ctx.accounts.role_assignment.as_ref()
        .map(|r| r.active && r.role == Role::Seizer && r.assignee == ctx.accounts.seizer.key())
        .unwrap_or(false);
    require!(is_master || is_seizer, SSSError::Unauthorized);

    // Verify target is actively blacklisted
    require!(ctx.accounts.blacklist_entry.active, SSSError::SeizeRequiresBlacklist);

    let amount = ctx.accounts.source_account.amount;
    require!(amount > 0, SSSError::MathOverflow);

    // Transfer via permanent delegate (the stablecoin PDA)
    let mint_key = ctx.accounts.mint.key();
    let seeds = &[
        STABLECOIN_SEED,
        mint_key.as_ref(),
        &[stablecoin.bump],
    ];

    token_2022::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token_2022::TransferChecked {
                from: ctx.accounts.source_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.treasury_account.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            &[seeds],
        ),
        amount,
        stablecoin.decimals,
    )?;

    emit!(events::TokensSeized {
        mint: ctx.accounts.mint.key(),
        from: ctx.accounts.source_account.key(),
        to: ctx.accounts.treasury_account.key(),
        amount,
        by: ctx.accounts.seizer.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(address: Pubkey, reason: String)]
pub struct BlacklistAdd<'info> {
    #[account(mut)]
    pub blacklister: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// Optional role assignment (not needed if caller is master authority)
    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Blacklister.to_seed(), blacklister.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    #[account(
        init_if_needed,
        payer = blacklister,
        space = BlacklistEntry::LEN,
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), address.as_ref()],
        bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct BlacklistRemove<'info> {
    #[account(mut)]
    pub blacklister: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// Optional role assignment (not needed if caller is master authority)
    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Blacklister.to_seed(), blacklister.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    #[account(
        mut,
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), address.as_ref()],
        bump = blacklist_entry.bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
}

#[derive(Accounts)]
pub struct Seize<'info> {
    #[account(mut)]
    pub seizer: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(constraint = mint.key() == stablecoin.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Optional role assignment (not needed if caller is master authority)
    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Seizer.to_seed(), seizer.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    /// Blacklist entry must exist and be active — proves the target is blacklisted
    #[account(
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), source_account.owner.as_ref()],
        bump = blacklist_entry.bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    /// Source token account (blacklisted address)
    #[account(mut)]
    pub source_account: InterfaceAccount<'info, TokenAccount>,

    /// Treasury token account to receive seized tokens
    #[account(mut)]
    pub treasury_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
