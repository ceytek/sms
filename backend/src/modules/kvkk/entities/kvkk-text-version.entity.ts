import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { KvkkTextDocument } from './kvkk-text-document.entity.js';

@Entity('kvkk_text_versions')
export class KvkkTextVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml: string;

  @Column({ name: 'is_current', default: true })
  isCurrent: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne('KvkkTextDocument', 'versions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: KvkkTextDocument;
}
