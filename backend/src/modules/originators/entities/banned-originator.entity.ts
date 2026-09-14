import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('banned_originators')
export class BannedOriginator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 11, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;
}
