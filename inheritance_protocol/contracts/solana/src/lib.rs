use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    clock::Clock,
    sysvar::Sysvar,
    borsh::{try_from_slice_unchecked, BorshSerialize, BorshDeserialize},
};

entrypoint!(process_instruction);

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct InheritanceState {
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub last_heartbeat: i64,
    pub inactivity_period: i64,
    pub fee_collector: Pubkey,
    pub is_claimed: bool,
}

fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let state_account = next_account_info(accounts_iter)?;
    let owner_account = next_account_info(accounts_iter)?;
    let beneficiary_account = next_account_info(accounts_iter)?;
    let fee_collector_account = next_account_info(accounts_iter)?;

    let mut state: InheritanceState = try_from_slice_unchecked(&state_account.data.borrow())?;

    match instruction_data[0] {
        0 => {
            if *owner_account.key != state.owner {
                return Err(ProgramError::InvalidArgument);
            }
            let clock = Clock::get()?;
            state.last_heartbeat = clock.unix_timestamp;
            state.serialize(&mut &mut state_account.data.borrow_mut()[..])?;
            msg!("Heartbeat updated");
        }
        1 => {
            if state.is_claimed {
                return Err(ProgramError::InvalidArgument);
            }
            let clock = Clock::get()?;
            if clock.unix_timestamp < state.last_heartbeat + state.inactivity_period {
                msg!("Still active");
                return Err(ProgramError::InvalidArgument);
            }
            state.is_claimed = true;
            state.serialize(&mut &mut state_account.data.borrow_mut()[..])?;

            let balance = **state_account.try_borrow_lamports()?;
            let fee = (balance * 200) / 10000;
            let to_beneficiary = balance - fee;

            **state_account.try_borrow_mut_lamports()? = 0;
            **beneficiary_account.try_borrow_mut_lamports()? += to_beneficiary;
            **fee_collector_account.try_borrow_mut_lamports()? += fee;
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }
    Ok(())
}
