import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { PriceList } from './price-list.entity.js';
import { Product } from '../../reference/entities/product.entity.js';

@Entity('price_list_items')
@Unique(['priceListId', 'productId'])
export class PriceListItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'price_list_id', type: 'uuid' })
  priceListId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 4 })
  unitPrice: number;

  @ManyToOne(() => PriceList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_list_id' })
  priceList: PriceList;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
