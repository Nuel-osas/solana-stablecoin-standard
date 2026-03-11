use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::error::SSSError;
use crate::events;
use crate::state::*;

pub fn handler(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(!stablecoin.paused, SSSError::Paused);

    // Verify burner role
    let role_assignment = &ctx.accounts.role_assignment;
    require!(role_assignment.active, SSSError::Unauthorized);
    require!(role_assignment.role == Role::Burner, SSSError::Unauthorized);
    require!(
        role_assignment.assignee == ctx.accounts.burner.key(),
        SSSError::Unauthorized
    );

    // Burn tokens
    token_2022::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.burn_from.to_account_info(),
                authority: ctx.accounts.burner.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update total burned
    let stablecoin = &mut ctx.accounts.stablecoin;
    stablecoin.total_burned = stablecoin.total_burned.checked_add(amount).ok_or(SSSError::MathOverflow)?;

    emit!(events::TokensBurned {
        mint: ctx.accounts.mint.key(),
        amount,
        burner: ctx.accounts.burner.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub burner: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(
        mut,
        constraint = mint.key() == stablecoin.mint,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Burner.to_seed(), burner.key().as_ref()],
        bump = role_assignment.bump,
    )]
    pub role_assignment: Account<'info, RoleAssignment>,

    /// Token account to burn from (must be owned by burner)
    #[account(
        mut,
        constraint = burn_from.owner == burner.key(),
    )]
    pub burn_from: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
