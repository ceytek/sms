import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ProductType } from '../../../common/enums/product-type.enum.js';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'credit_amount', type: 'int' })
  creditAmount: number;

  @Column({
    name: 'product_type',
    type: 'enum',
    enum: ProductType,
    default: ProductType.SMS,
  })
  productType: ProductType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
