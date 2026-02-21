import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/jwt.strategy';
import { ChatUser } from './chat.entity';
import { ChatService } from './chat.service';

const ROOM_PREFIX = 'room:';

export type SocketWithUser = {
  join: (r: string) => void;
  leave: (r: string) => void;
  rooms: Set<string>;
  data: { user?: ChatUser | null };
  to: (room: string) => { emit: (ev: string, payload: unknown) => void };
};

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: SocketWithUser & { handshake: { auth?: { token?: string }; query?: { token?: string } } }) {
    const token =
      (client.handshake?.auth as { token?: string } | undefined)?.token ??
      (typeof client.handshake?.query?.token === 'string' ? client.handshake.query.token : undefined);
    if (!token) {
      client.data.user = null;
      return;
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.authService.findById(payload.sub);
      client.data.user = user ?? null;
    } catch {
      client.data.user = null;
    }
  }

  @SubscribeMessage('chat:join')
  handleJoin(
    @MessageBody() payload: { roomId?: string | null },
    @ConnectedSocket() client: SocketWithUser,
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
    @MessageBody() payload: {
      author?: string;
      content: string;
      roomId?: string | null;
      userId?: string | null;
    },
    @ConnectedSocket() client: SocketWithUser,
  ) {
    const user = client.data?.user ?? null;
    const author = (user?.username ?? (payload?.author && String(payload.author).trim())) || 'Anonymous';
    const content = payload?.content != null ? String(payload.content).trim() : '';
    const roomId = payload?.roomId != null && payload.roomId !== '' ? String(payload.roomId) : null;
    const userId = user?.id ?? (payload?.userId != null && payload.userId !== '' ? String(payload.userId) : null);
    if (!content) return;
    const msg = await this.chatService.create(author, content, undefined, roomId, userId);
    this.emitMessage(msg, roomId);
  }

  emitMessage(
    msg: {
      id: string;
      userId?: string | null;
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
      userId: msg.userId ?? null,
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

  emitMessageDeleted(messageId: string, roomId?: string | null) {
    const roomName = roomId ? ROOM_PREFIX + roomId : ROOM_PREFIX + 'default';
    this.server.to(roomName).emit('chat:messageDeleted', { id: messageId });
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @MessageBody() payload: { roomId?: string | null; isTyping?: boolean },
    @ConnectedSocket() client: SocketWithUser,
  ) {
    const roomId = payload?.roomId != null && payload.roomId !== '' ? String(payload.roomId) : null;
    const roomName = roomId ? ROOM_PREFIX + roomId : ROOM_PREFIX + 'default';
    const user = client.data?.user;
    const author = user?.username ?? 'Anonymous';
    const userId = user?.id ?? null;
    client.to(roomName).emit('chat:typing', {
      roomId,
      author,
      userId,
      isTyping: payload?.isTyping !== false,
    });
  }

  @SubscribeMessage('chat:read')
  handleRead(
    @MessageBody() payload: { roomId?: string | null; messageId?: string },
    @ConnectedSocket() client: SocketWithUser,
  ) {
    const roomId = payload?.roomId != null && payload.roomId !== '' ? String(payload.roomId) : null;
    const roomName = roomId ? ROOM_PREFIX + roomId : ROOM_PREFIX + 'default';
    const user = client.data?.user;
    const userId = user?.id ?? null;
    if (!userId) return;
    client.to(roomName).emit('chat:read', {
      roomId,
      userId,
      messageId: payload?.messageId ?? null,
    });
  }
}
