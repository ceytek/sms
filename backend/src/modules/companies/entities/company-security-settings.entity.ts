import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { IpRuleType } from '../../../common/enums/ip-rule-type.enum.js';
import { Company } from './company.entity.js';

@Entity('company_security_settings')
export class CompanySecuritySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', unique: true })
  companyId: string;

  @Column({
    name: 'ip_rule_type',
    type: 'enum',
    enum: IpRuleType,
    default: IpRuleType.NO_CONTROL,
  })
  ipRuleType: IpRuleType;

  @Column({ name: 'file_password_encrypted', type: 'text', nullable: true })
  filePasswordEncrypted?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
