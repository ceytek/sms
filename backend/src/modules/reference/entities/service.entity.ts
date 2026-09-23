import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ServiceBillingPeriod } from '../../../common/enums/service-billing-period.enum.js';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'billing_period',
    type: 'enum',
    enum: ServiceBillingPeriod,
    enumName: 'service_billing_period_enum',
    default: ServiceBillingPeriod.ALWAYS,
  })
  billingPeriod: ServiceBillingPeriod;

  @Column({ name: 'term_months', type: 'int', default: 12 })
  termMonths: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
