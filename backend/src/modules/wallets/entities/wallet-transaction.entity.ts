import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransactionType } from '../../../common/enums/transaction-type.enum.js';
import { Wallet } from './wallet.entity.js';
import { PriceList } from '../../pricing/entities/price-list.entity.js';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  amount: number;

  @Column({ name: 'balance_before', type: 'decimal', precision: 14, scale: 4 })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 14, scale: 4 })
  balanceAfter: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 4, nullable: true })
  unitPrice?: number;

  @Column({ name: 'price_list_id', type: 'uuid', nullable: true })
  priceListId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType?: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @ManyToOne(() => PriceList, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'price_list_id' })
  priceList?: PriceList;
}
