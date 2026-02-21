import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { ChatUser } from './chat.entity';

export type FriendStatus = 'pending' | 'accepted';

@Entity('chat_friend')
@Unique(['userId', 'friendId'])
export class ChatFriend {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'uuid' })
  friendId: string;

  @ManyToOne(() => ChatUser, { onDelete: 'CASCADE' })
  user: ChatUser;

  @ManyToOne(() => ChatUser, { onDelete: 'CASCADE' })
  friend: ChatUser;

  @CreateDateColumn()
  createdAt: Date;

  /** pending = request sent; accepted = friends */
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: FriendStatus;
}
