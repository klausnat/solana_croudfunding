use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{Sysvar, SysvarId},
};
use std::collections::HashMap;

// Ошибки программы
#[derive(Debug)]
pub enum CrowdfundingError {
    InvalidAmount,
    CampaignNotActive,
    CampaignEnded,
    GoalAlreadyReached,
    InsufficientFunds,
    WithdrawalNotAllowed,
    InvalidCampaignData,
}

impl From<CrowdfundingError> for ProgramError {
    fn from(e: CrowdfundingError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// Структура кампании
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Campaign {
    pub creator: Pubkey,
    pub title: String,
    pub description: String,
    pub goal_amount: u64,           // Цель в lamports
    pub amount_raised: u64,         // Собранная сумма
    pub donors_count: u32,          // Количество доноров
    pub created_at: i64,            // Timestamp создания
    pub deadline: i64,              // Timestamp дедлайна
    pub is_active: bool,            // Активна ли кампания
    pub category: CampaignCategory, // Категория
    pub withdrawn: bool,            // Были ли выведены средства
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum CampaignCategory {
    Technology,
    Art,
    Music,
    Film,
    Games,
    Education,
    Social,
    Other,
}

// Структура донора
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct DonorInfo {
    pub donor: Pubkey,
    pub amount: u64,
    pub donated_at: i64,
    pub campaign_id: Pubkey,
}

// Точка входа программы
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = instruction_data
        .first()
        .ok_or(ProgramError::InvalidInstructionData)?;

    match instruction {
        // Создание кампании
        0 => create_campaign(program_id, accounts, &instruction_data[1..]),
        
        // Пожертвование в кампанию
        1 => donate_to_campaign(program_id, accounts, &instruction_data[1..]),
        
        // Вывод средств (только создатель)
        2 => withdraw_funds(program_id, accounts, &instruction_data[1..]),
        
        // Получение информации о кампании
        3 => get_campaign_info(program_id, accounts),
        
        // Отмена кампании (возврат средств)
        4 => cancel_campaign(program_id, accounts),
        
        // Обновление информации о кампании
        5 => update_campaign(program_id, accounts, &instruction_data[1..]),
        
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

// Создание новой кампании
fn create_campaign(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    
    // Получаем аккаунты
    let creator = next_account_info(accounts_iter)?;
    let campaign_account = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    
    // Проверяем подпись создателя
    if !creator.is_signer {
        msg!("Creator must sign the transaction");
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Получаем текущее время
    let clock = Clock::get()?;
    
    // Парсим данные кампании
    let mut data_iter = data.iter();
    
    // Читаем заголовок (первые 4 байта - длина)
    let title_len = u32::from_le_bytes([
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
    ]) as usize;
    
    let title_bytes: Vec<u8> = data_iter.by_ref().take(title_len).copied().collect();
    let title = String::from_utf8(title_bytes)
        .map_err(|_| CrowdfundingError::InvalidCampaignData)?;
    
    // Читаем описание
    let desc_len = u32::from_le_bytes([
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
    ]) as usize;
    
    let desc_bytes: Vec<u8> = data_iter.by_ref().take(desc_len).copied().collect();
    let description = String::from_utf8(desc_bytes)
        .map_err(|_| CrowdfundingError::InvalidCampaignData)?;
    
    // Читаем цель сбора
    let goal_amount = u64::from_le_bytes([
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
    ]);
    
    // Читаем дедлайн (timestamp)
    let deadline = i64::from_le_bytes([
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
        *data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?,
    ]);
    
    // Читаем категорию
    let category_byte = data_iter.next().ok_or(CrowdfundingError::InvalidCampaignData)?;
    let category = match category_byte {
        0 => CampaignCategory::Technology,
        1 => CampaignCategory::Art,
        2 => CampaignCategory::Music,
        3 => CampaignCategory::Film,
        4 => CampaignCategory::Games,
        5 => CampaignCategory::Education,
        6 => CampaignCategory::Social,
        7 => CampaignCategory::Other,
        _ => return Err(CrowdfundingError::InvalidCampaignData.into()),
    };
    
    // Проверяем дедлайн
    if deadline <= clock.unix_timestamp {
        msg!("Deadline must be in the future");
        return Err(CrowdfundingError::InvalidCampaignData.into());
    }
    
    // Создаем кампанию
    let campaign = Campaign {
        creator: *creator.key,
        title,
        description,
        goal_amount,
        amount_raised: 0,
        donors_count: 0,
        created_at: clock.unix_timestamp,
        deadline,
        is_active: true,
        category,
        withdrawn: false,
    };
    
    // Вычисляем размер данных
    let data_len = data.len();
    let campaign_data = borsh::to_vec(&campaign)?;
    let total_len = campaign_data.len();
    
    // Создаем аккаунт для кампании
    let rent = solana_program::sysvar::rent::Rent::get()?;
    let lamports_required = rent.minimum_balance(total_len);
    
    invoke(
        &system_instruction::create_account(
            creator.key,
            campaign_account.key,
            lamports_required,
            total_len as u64,
            program_id,
        ),
        &[creator.clone(), campaign_account.clone(), system_program.clone()],
    )?;
    
    // Сохраняем данные кампании
    let mut campaign_data_mut = campaign_account.data.borrow_mut();
    campaign_data_mut[..campaign_data.len()].copy_from_slice(&campaign_data);
    
    msg!("Campaign created successfully");
    msg!("Campaign ID: {}", campaign_account.key);
    msg!("Goal: {} lamports", goal_amount);
    msg!("Deadline: {}", deadline);
    
    Ok(())
}

// Пожертвование в кампанию
fn donate_to_campaign(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    
    // Получаем аккаунты
    let donor = next_account_info(accounts_iter)?;
    let campaign_account = next_account_info(accounts_iter)?;
    let donor_info_account = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    
    // Проверяем подпись донора
    if !donor.is_signer {
        msg!("Donor must sign the transaction");
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Читаем сумму пожертвования
    let donation_amount = u64::from_le_bytes([
        data[0], data[1], data[2], data[3],
        data[4], data[5], data[6], data[7],
    ]);
    
    if donation_amount == 0 {
        msg!("Donation amount must be greater than 0");
        return Err(CrowdfundingError::InvalidAmount.into());
    }
    
    // Проверяем баланс донора
    if donor.lamports() < donation_amount {
        msg!("Insufficient funds");
        return Err(CrowdfundingError::InsufficientFunds.into());
    }
    
    // Загружаем данные кампании
    let mut campaign_data = Campaign::try_from_slice(&campaign_account.data.borrow())?;
    
    // Проверяем активность кампании
    if !campaign_data.is_active {
        msg!("Campaign is not active");
        return Err(CrowdfundingError::CampaignNotActive.into());
    }
    
    // Проверяем дедлайн
    let clock = Clock::get()?;
    if clock.unix_timestamp > campaign_data.deadline {
        msg!("Campaign has ended");
        campaign_data.is_active = false;
        campaign_data.serialize(&mut &mut campaign_account.data.borrow_mut()[..])?;
        return Err(CrowdfundingError::CampaignEnded.into());
    }
    
    // Переводим средства
    invoke(
        &system_instruction::transfer(donor.key, campaign_account.key, donation_amount),
        &[donor.clone(), campaign_account.clone(), system_program.clone()],
    )?;
    
    // Обновляем данные кампании
    campaign_data.amount_raised += donation_amount;
    campaign_data.donors_count += 1;
    
    // Проверяем, достигнута ли цель
    if campaign_data.amount_raised >= campaign_data.goal_amount {
        msg!("Campaign goal reached!");
    }
    
    // Сохраняем обновленные данные
    campaign_data.serialize(&mut &mut campaign_account.data.borrow_mut()[..])?;
    
    // Создаем запись о доноре
    let donor_info = DonorInfo {
        donor: *donor.key,
        amount: donation_amount,
        donated_at: clock.unix_timestamp,
        campaign_id: *campaign_account.key,
    };
    
    // Сохраняем информацию о доноре
    let donor_data = borsh::to_vec(&donor_info)?;
    let mut donor_data_mut = donor_info_account.data.borrow_mut();
    
    // Если аккаунт не инициализирован, создаем его
    if donor_info_account.data_len() == 0 {
        let rent = solana_program::sysvar::rent::Rent::get()?;
        let lamports_required = rent.minimum_balance(donor_data.len());
        
        invoke(
            &system_instruction::create_account(
                donor.key,
                donor_info_account.key,
                lamports_required,
                donor_data.len() as u64,
                program_id,
            ),
            &[donor.clone(), donor_info_account.clone(), system_program.clone()],
        )?;
    }
    
    donor_data_mut[..donor_data.len()].copy_from_slice(&donor_data);
    
    msg!("Donation successful");
    msg!("Donor: {}", donor.key);
    msg!("Amount: {} lamports", donation_amount);
    msg!("Total raised: {} lamports", campaign_data.amount_raised);
    
    Ok(())
}

// Вывод средств создателем
fn withdraw_funds(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    
    // Получаем аккаунты
    let creator = next_account_info(accounts_iter)?;
    let campaign_account = next_account_info(accounts_iter)?;
    let creator_account = next_account_info(accounts_iter)?;
    
    // Проверяем подпись создателя
    if !creator.is_signer {
        msg!("Creator must sign the transaction");
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Загружаем данные кампании
    let campaign_data = Campaign::try_from_slice(&campaign_account.data.borrow())?;
    
    // Проверяем, что инициатор - создатель кампании
    if campaign_data.creator != *creator.key {
        msg!("Only campaign creator can withdraw funds");
        return Err(CrowdfundingError::WithdrawalNotAllowed.into());
    }
    
    // Проверяем дедлайн
    let clock = Clock::get()?;
    if clock.unix_timestamp < campaign_data.deadline && campaign_data.amount_raised < campaign_data.goal_amount {
        msg!("Cannot withdraw before deadline unless goal is reached");
        return Err(CrowdfundingError::WithdrawalNotAllowed.into());
    }
    
    // Проверяем, что средства еще не были выведены
    if campaign_data.withdrawn {
        msg!("Funds already withdrawn");
        return Err(CrowdfundingError::WithdrawalNotAllowed.into());
    }
    
    // Проверяем, что есть средства для вывода
    if campaign_account.lamports() == 0 {
        msg!("No funds to withdraw");
        return Err(CrowdfundingError::InsufficientFunds.into());
    }
    
    // Переводим средства создателю
    **creator_account.lamports.borrow_mut() = creator_account
        .lamports()
        .checked_add(campaign_account.lamports())
        .ok_or(ProgramError::InvalidArgument)?;
    
    **campaign_account.lamports.borrow_mut() = 0;
    
    // Обновляем статус кампании
    let mut updated_campaign = campaign_data.clone();
    updated_campaign.withdrawn = true;
    updated_campaign.is_active = false;
    
    updated_campaign.serialize(&mut &mut campaign_account.data.borrow_mut()[..])?;
    
    msg!("Funds withdrawn successfully");
    msg!("Amount: {} lamports", campaign_data.amount_raised);
    msg!("To: {}", creator.key);
    
    Ok(())
}

// Другие функции (get_campaign_info, cancel_campaign, update_campaign) реализуются аналогично

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program_test::*;
    use solana_sdk::{signature::Signer, transaction::Transaction};
    
    #[tokio::test]
    async fn test_create_campaign() {
        // Тестовая логика
    }
}