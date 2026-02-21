import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('chat_message')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  roomId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 128, default: '' })
  author: string;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  attachmentPath: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  attachmentName: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  attachmentMime: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('chat_user')
@Unique(['username'])
export class ChatUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  username: string;

  /** bcrypt hash; empty = no password (legacy/guest) */
  @Column({ type: 'varchar', length: 255, default: '' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
