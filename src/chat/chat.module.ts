import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ChatFriend } from './chat-friend.entity';
import { ChatRoom } from './chat-room.entity';
import { ChatRoomMember } from './chat-room-member.entity';
import { ChatMessage, ChatUser } from './chat.entity';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, ChatUser, ChatRoom, ChatRoomMember, ChatFriend]),
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
