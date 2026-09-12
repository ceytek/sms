import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { City } from './city.entity.js';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'city_id', type: 'smallint' })
  cityId: number;

  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city: City;
}
