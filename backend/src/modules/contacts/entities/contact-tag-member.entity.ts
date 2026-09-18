import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contact } from './contact.entity.js';
import { ContactTag } from './contact-tag.entity.js';

@Entity('contact_tag_members')
export class ContactTagMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @Column({ name: 'tag_id', type: 'uuid' })
  tagId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Contact, (contact) => contact.tagMembers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @ManyToOne(() => ContactTag, (tag) => tag.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: ContactTag;
}
