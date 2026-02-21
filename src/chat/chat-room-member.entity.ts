import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { ChatUser } from './chat.entity';

@Entity('chat_room_member')
@Unique(['roomId', 'userId'])
export class ChatRoomMember {
  @PrimaryColumn({ type: 'uuid' })
  roomId: string;

  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => ChatRoom, { onDelete: 'CASCADE' })
  room: ChatRoom;

  @ManyToOne(() => ChatUser, { onDelete: 'CASCADE' })
  user: ChatUser;

  @CreateDateColumn()
  joinedAt: Date;
}
