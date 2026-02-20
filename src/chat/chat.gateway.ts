import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ChatService } from './chat.service';

const ROOM_PREFIX = 'room:';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('chat:join')
  handleJoin(
    @MessageBody() payload: { roomId?: string | null },
    @ConnectedSocket() client: { join: (room: string) => void; leave: (room: string) => void; rooms: Set<string> },
  ) {
    const roomId = payload?.roomId != null && payload.roomId !== '' ? String(payload.roomId) : null;
    const roomName = roomId ? ROOM_PREFIX + roomId : ROOM_PREFIX + 'default';
    client.rooms.forEach((r) => {
      if (r.startsWith(ROOM_PREFIX)) client.leave(r);
    });
    client.join(roomName);
    return { room: roomName };
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @MessageBody() payload: { author?: string; content: string; roomId?: string | null },
  ) {
    const author = (payload?.author && String(payload.author).trim()) || 'Anonymous';
    const content = payload?.content != null ? String(payload.content).trim() : '';
    const roomId = payload?.roomId != null && payload.roomId !== '' ? String(payload.roomId) : null;
    if (!content) return;
    const msg = await this.chatService.create(author, content, undefined, roomId);
    this.emitMessage(msg, roomId);
  }

  emitMessage(
    msg: {
      id: string;
      author: string;
      content: string;
      createdAt: Date;
      attachmentPath?: string | null;
      attachmentName?: string | null;
      attachmentMime?: string | null;
    },
    roomId?: string | null,
  ) {
    const payload = {
      id: msg.id,
      author: msg.author,
      content: msg.content,
      createdAt: msg.createdAt,
      attachmentPath: msg.attachmentPath ?? null,
      attachmentName: msg.attachmentName ?? null,
      attachmentMime: msg.attachmentMime ?? null,
    };
    const roomName = roomId ? ROOM_PREFIX + roomId : ROOM_PREFIX + 'default';
    this.server.to(roomName).emit('chat:message', payload);
  }
}
