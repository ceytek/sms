import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Company } from './company.entity.js';
import { PriceList } from '../../pricing/entities/price-list.entity.js';

@Entity('company_price_lists')
@Unique(['companyId', 'priceListId'])
export class CompanyPriceList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'price_list_id', type: 'uuid' })
  priceListId: string;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy?: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => PriceList)
  @JoinColumn({ name: 'price_list_id' })
  priceList: PriceList;
}
