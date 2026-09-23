import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity.js';
import { Service } from '../../reference/entities/service.entity.js';
import { CompanyService } from './company-service.entity.js';

@Entity('company_service_terms')
export class CompanyServiceTerm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_service_id', type: 'uuid' })
  companyServiceId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId: string;

  @Column({ name: 'starts_year', type: 'int' })
  startsYear: number;

  @Column({ name: 'started_at', type: 'date' })
  startedAt: string;

  @Column({ name: 'expires_at', type: 'date' })
  expiresAt: string;

  @Column({ name: 'is_current', default: true })
  isCurrent: boolean;

  @Column({ name: 'expiry_reminder_sent_at', type: 'timestamptz', nullable: true })
  expiryReminderSentAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CompanyService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_service_id' })
  companyService: CompanyService;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Service;
}
