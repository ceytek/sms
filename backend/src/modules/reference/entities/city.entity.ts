import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cities')
export class City {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'plate_code', length: 2 })
  plateCode: string;
}
