import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CredentialType } from '../../../common/enums/credential-type.enum.js';
import { Company } from '../../companies/entities/company.entity.js';

@Entity('company_credentials')
export class CompanyCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({
    name: 'credential_type',
    type: 'enum',
    enum: CredentialType,
  })
  credentialType: CredentialType;

  @Column({ name: 'entity_type', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'encrypted_value', type: 'text' })
  encryptedValue: string;

  @Column({ name: 'key_version', type: 'int', default: 1 })
  keyVersion: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
