import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { IysStatus } from '../../../common/enums/iys-status.enum.js';
import { Company } from './company.entity.js';

@Entity('company_iys_settings')
export class CompanyIysSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', unique: true })
  companyId: string;

  @Column({ name: 'iys_code', length: 50, nullable: true })
  iysCode?: string;

  @Column({ name: 'brand_code', length: 50, nullable: true })
  brandCode?: string;

  @Column({
    type: 'enum',
    enum: IysStatus,
    default: IysStatus.PASSIVE,
  })
  status: IysStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
