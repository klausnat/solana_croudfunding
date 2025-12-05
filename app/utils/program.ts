import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Структуры данных TypeScript
export class Campaign {
  creator: Uint8Array;
  title: string;
  description: string;
  goal_amount: number;
  amount_raised: number;
  donors_count: number;
  created_at: number;
  deadline: number;
  is_active: boolean;
  category: number;
  withdrawn: boolean;

  constructor(fields: any) {
    this.creator = fields.creator;
    this.title = fields.title;
    this.description = fields.description;
    this.goal_amount = fields.goal_amount;
    this.amount_raised = fields.amount_raised;
    this.donors_count = fields.donors_count;
    this.created_at = fields.created_at;
    this.deadline = fields.deadline;
    this.is_active = fields.is_active;
    this.category = fields.category;
    this.withdrawn = fields.withdrawn;
  }
}

export const CampaignSchema = new Map([
  [Campaign, {
    kind: 'struct',
    fields: [
      ['creator', [32]],
      ['title', 'string'],
      ['description', 'string'],
      ['goal_amount', 'u64'],
      ['amount_raised', 'u64'],
      ['donors_count', 'u32'],
      ['created_at', 'i64'],
      ['deadline', 'i64'],
      ['is_active', 'u8'],
      ['category', 'u8'],
      ['withdrawn', 'u8'],
    ]
  }]
]);

// Константы
export const PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID');
export const NETWORK = 'devnet';

// Функции для взаимодействия с программой
export class CrowdfundingClient {
  connection: Connection;
  programId: PublicKey;

  constructor(connection: Connection, programId: PublicKey) {
    this.connection = connection;
    this.programId = programId;
  }

  // Создание кампании
  async createCampaign(
    wallet: WalletContextState,
    title: string,
    description: string,
    goalAmount: number,
    deadline: number,
    category: number
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    // Генерируем PDA для кампании
    const campaignAccount = Keypair.generate();
    
    // Подготавливаем данные
    const campaignData = new Campaign({
      creator: wallet.publicKey.toBuffer(),
      title,
      description,
      goal_amount: goalAmount,
      amount_raised: 0,
      donors_count: 0,
      created_at: Math.floor(Date.now() / 1000),
      deadline,
      is_active: true,
      category,
      withdrawn: false,
    });

    const data = borsh.serialize(CampaignSchema, campaignData);
    
    // Создаем инструкцию
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaignAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.from([0, ...data]),
    });

    // Создаем транзакцию
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;

    // Подписываем и отправляем
    const signed = await wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());

    await this.connection.confirmTransaction(signature);
    return signature;
  }

  // Пожертвование в кампанию
  async donateToCampaign(
    wallet: WalletContextState,
    campaignPubkey: PublicKey,
    amount: number
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const donorInfoAccount = Keypair.generate();
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaignPubkey, isSigner: false, isWritable: true },
        { pubkey: donorInfoAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.from([1, ...new Uint8Array(new BigInt64Array([BigInt(amount)]).buffer)]),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());

    await this.connection.confirmTransaction(signature);
    return signature;
  }

  // Получение информации о кампании
  async getCampaignInfo(campaignPubkey: PublicKey): Promise<Campaign | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(campaignPubkey);
      if (!accountInfo?.data) return null;

      return borsh.deserialize(CampaignSchema, Campaign, accountInfo.data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  // Получение всех кампаний (используем getProgramAccounts)
  async getAllCampaigns(): Promise<Array<{ pubkey: PublicKey; campaign: Campaign }>> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [{ dataSize: 500 }] // Примерный размер данных
    });

    return accounts.map(account => ({
      pubkey: account.pubkey,
      campaign: borsh.deserialize(CampaignSchema, Campaign, account.account.data)
    }));
  }
}