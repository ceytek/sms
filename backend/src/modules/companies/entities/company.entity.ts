import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { CompanyType } from '../../../common/enums/company-type.enum.js';
import { CompanyStatus } from '../../../common/enums/company-status.enum.js';
import { CustomerType } from '../../../common/enums/customer-type.enum.js';
import { City } from '../../reference/entities/city.entity.js';
import { District } from '../../reference/entities/district.entity.js';
import { CustomerCategory } from '../../reference/entities/customer-category.entity.js';
import { CustomerSubcategory } from '../../reference/entities/customer-subcategory.entity.js';
import type { User } from '../../auth/entities/user.entity.js';
import type { CompanyContact } from './company-contact.entity.js';
import type { CompanyNote } from './company-note.entity.js';
import type { CompanySecuritySettings } from './company-security-settings.entity.js';
import type { CompanyIpRule } from './company-ip-rule.entity.js';
import type { CompanySmsAccount } from './company-sms-account.entity.js';
import type { CompanyOriginator } from './company-originator.entity.js';
import type { CompanyCreditAlert } from './company-credit-alert.entity.js';
import type { CompanyService } from './company-service.entity.js';
import type { CompanyServiceKeyword } from './company-service-keyword.entity.js';
import type { CompanyIysSettings } from './company-iys-settings.entity.js';
import type { CompanyCustomPrice } from './company-custom-price.entity.js';
import type { CompanyPriceList } from './company-price-list.entity.js';
import type { Wallet } from '../../wallets/entities/wallet.entity.js';
import type { CompanyCredential } from '../../credentials/entities/company-credential.entity.js';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ name: 'company_code', unique: true, length: 20 })
  companyCode: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    name: 'company_type',
    type: 'enum',
    enum: CompanyType,
  })
  companyType: CompanyType;

  @Column({
    name: 'customer_type',
    type: 'enum',
    enum: CustomerType,
    nullable: true,
  })
  customerType?: CustomerType;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.ACTIVE,
  })
  status: CompanyStatus;

  @Column({ name: 'is_sub_account', default: false })
  isSubAccount: boolean;

  @Column({ name: 'is_dealer', default: false })
  isDealer: boolean;

  @Column({ name: 'parent_company_id', type: 'uuid', nullable: true })
  parentCompanyId?: string;

  @Column({ name: 'dealer_company_id', type: 'uuid', nullable: true })
  dealerCompanyId?: string;

  @Column({ name: 'tax_office', length: 100, nullable: true })
  taxOffice?: string;

  @Column({ name: 'tax_number', length: 20, nullable: true })
  taxNumber?: string;

  @Column({ name: 'national_id', length: 11, nullable: true })
  nationalId?: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ name: 'serial_number', length: 50, nullable: true })
  serialNumber?: string;

  @Column({ name: 'city_id', type: 'smallint', nullable: true })
  cityId?: number;

  @Column({ name: 'district_id', type: 'int', nullable: true })
  districtId?: number;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ name: 'subcategory_id', type: 'uuid', nullable: true })
  subcategoryId?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 20, nullable: true })
  mobile?: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ name: 'show_announcement', default: true })
  showAnnouncement: boolean;

  @Column({ name: 'documents_completed', default: false })
  documentsCompleted: boolean;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'parent_company_id' })
  parentCompany?: Company;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'dealer_company_id' })
  dealerCompany?: Company;

  @ManyToOne(() => City, { nullable: true })
  @JoinColumn({ name: 'city_id' })
  city?: City;

  @ManyToOne(() => District, { nullable: true })
  @JoinColumn({ name: 'district_id' })
  district?: District;

  @ManyToOne(() => CustomerCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: CustomerCategory;

  @ManyToOne(() => CustomerSubcategory, { nullable: true })
  @JoinColumn({ name: 'subcategory_id' })
  subcategory?: CustomerSubcategory;

  @OneToMany('User', 'company')
  users: User[];

  @OneToMany('CompanyContact', 'company')
  contacts: CompanyContact[];

  @OneToMany('CompanyNote', 'company')
  notes: CompanyNote[];

  @OneToMany('CompanySecuritySettings', 'company')
  securitySettings: CompanySecuritySettings[];

  @OneToMany('CompanyIpRule', 'company')
  ipRules: CompanyIpRule[];

  @OneToMany('CompanySmsAccount', 'company')
  smsAccounts: CompanySmsAccount[];

  @OneToMany('CompanyOriginator', 'company')
  originators: CompanyOriginator[];

  @OneToMany('CompanyCreditAlert', 'company')
  creditAlerts: CompanyCreditAlert[];

  @OneToMany('CompanyService', 'company')
  services: CompanyService[];

  @OneToMany('CompanyServiceKeyword', 'company')
  serviceKeywords: CompanyServiceKeyword[];

  @OneToMany('CompanyIysSettings', 'company')
  iysSettings: CompanyIysSettings[];

  @OneToMany('CompanyCustomPrice', 'company')
  customPrices: CompanyCustomPrice[];

  @OneToMany('CompanyPriceList', 'company')
  priceListAssignments: CompanyPriceList[];

  @OneToMany('Wallet', 'company')
  wallets: Wallet[];

  @OneToMany('CompanyCredential', 'company')
  credentials: CompanyCredential[];
}
