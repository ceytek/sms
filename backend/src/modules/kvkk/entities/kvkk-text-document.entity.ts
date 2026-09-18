import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import type { KvkkTextVersion } from './kvkk-text-version.entity.js';

@Entity('kvkk_text_documents')
export class KvkkTextDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Column({ length: 160 })
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;

  @OneToMany('KvkkTextVersion', 'document')
  versions: KvkkTextVersion[];
}
