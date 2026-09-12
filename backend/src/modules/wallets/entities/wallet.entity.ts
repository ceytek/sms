import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { WalletType } from '../../../common/enums/wallet-type.enum.js';
import { Company } from '../../companies/entities/company.entity.js';

@Entity('wallets')
@Unique(['companyId', 'walletType'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({
    name: 'wallet_type',
    type: 'enum',
    enum: WalletType,
  })
  walletType: WalletType;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  balance: number;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
