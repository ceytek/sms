import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { PriceListType } from '../../../common/enums/price-list-type.enum.js';
import { Company } from '../../companies/entities/company.entity.js';
import type { PriceListItem } from './price-list-item.entity.js';
import type { CompanyPriceList } from '../../companies/entities/company-price-list.entity.js';

@Entity('price_lists')
export class PriceList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({
    name: 'list_type',
    type: 'enum',
    enum: PriceListType,
  })
  listType: PriceListType;

  @Column({ name: 'owner_company_id', type: 'uuid', nullable: true })
  ownerCompanyId?: string;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom?: Date;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo?: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany?: Company;

  @OneToMany('PriceListItem', 'priceList')
  items: PriceListItem[];

  @OneToMany('CompanyPriceList', 'priceList')
  companyAssignments: CompanyPriceList[];
}
