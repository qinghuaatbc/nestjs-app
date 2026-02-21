import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { ChatUser } from './chat.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

const CHAT_UPLOADS = join(process.cwd(), 'public', 'chat-uploads');

@Controller('api/chat')
@UseGuards(OptionalJwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('rooms/mine')
  async getMyRooms(@CurrentUser() user: ChatUser | null) {
    if (!user) return [];
    try {
      return await this.chatService.listRoomsForUser(user.id);
    } catch (e) {
      this.logger.warn('getMyRooms failed', e instanceof Error ? e.message : e);
      const msg = this.safeErrorMessage(e);
      throw new ServiceUnavailableException(msg);
    }
  }

  @Get('rooms')
  async getRooms() {
    try {
      return await this.chatService.listRooms();
    } catch (e) {
      this.logger.warn('getRooms failed', e instanceof Error ? e.message : e);
      const msg = this.safeErrorMessage(e);
      throw new ServiceUnavailableException(msg);
    }
  }

  private safeErrorMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e && typeof (e as Error).message === 'string') {
      return (e as Error).message;
    }
    return 'Database unavailable. Start PostgreSQL (e.g. docker-compose up -d).';
  }

  @Post('rooms')
  async addRoom(
    @Body() body: { name?: string },
    @CurrentUser() user?: ChatUser | null,
  ) {
    const name = (body?.name && String(body.name).trim()) || '';
    const room = await this.chatService.createRoom(name, user?.id ?? null);
    return { id: room.id, name: room.name, createdAt: room.createdAt };
  }

  @Get('conversation/:userId')
  async getOrCreateConversation(
    @Param('userId') otherUserId: string,
    @CurrentUser() user?: ChatUser | null,
  ) {
    if (!user) throw new UnauthorizedException('Login required');
    const room = await this.chatService.getOrCreate1To1Room(user.id, otherUserId);
    return { id: room.id, name: room.name, createdAt: room.createdAt };
  }

  @Get('friends')
  @UseGuards(JwtAuthGuard)
  async listFriends(@CurrentUser() user: ChatUser) {
    const friends = await this.chatService.listFriends(user.id);
    return friends.map((u) => ({ id: u.id, username: u.username }));
  }

  @Post('friends')
  @UseGuards(JwtAuthGuard)
  async addFriend(
    @Body() body: { friendId?: string; username?: string },
    @CurrentUser() user: ChatUser,
  ) {
    let friendId = body?.friendId;
    if (!friendId && body?.username) {
      const friend = await this.chatService.findByUsername(body.username);
      if (!friend) throw new NotFoundException('User not found');
      friendId = friend.id;
    }
    if (!friendId) throw new BadRequestException('friendId or username required');
    await this.chatService.addFriendRequest(user.id, friendId);
    return { ok: true };
  }

  @Post('friends/accept')
  @UseGuards(JwtAuthGuard)
  async acceptFriend(
    @Body() body: { friendId?: string },
    @CurrentUser() user: ChatUser,
  ) {
    if (!body?.friendId) throw new BadRequestException('friendId required');
    await this.chatService.acceptFriendRequest(user.id, body.friendId);
    return { ok: true };
  }

  @Get('friends/pending')
  @UseGuards(JwtAuthGuard)
  async listPending(@CurrentUser() user: ChatUser) {
    const users = await this.chatService.listPendingReceived(user.id);
    return users.map((u) => ({ id: u.id, username: u.username }));
  }

  @Get('user-list')
  async getUsers() {
    const users = await this.chatService.listUsers();
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      createdAt: u.createdAt == null ? null : (u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt),
    }));
  }

  @Get('messages')
  getMessages(@Query('roomId') roomId?: string, @Query('limit') limit?: string) {
    const n = Math.min(Math.max(parseInt(limit || '100', 10) || 100, 1), 500);
    return this.chatService.findRecent(roomId || null, n);
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id') id: string,
    @Body('author') author?: string,
    @Body('userId') userId?: string,
    @CurrentUser() user?: ChatUser | null,
  ) {
    const uid = user?.id ?? userId ?? null;
    const authorStr = user?.username ?? author ?? null;
    const { roomId } = await this.chatService.deleteMessage(id, authorStr, uid);
    this.chatGateway.emitMessageDeleted(id, roomId);
    return { ok: true };
  }

  @Post('register')
  async register(@Body() body: { username?: string }) {
    const user = await this.chatService.register(body?.username ?? '');
    return { id: user.id, username: user.username };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 1024 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const mime = (file.mimetype || '').toLowerCase();
        const ok =
          mime.startsWith('video/') ||
          mime.startsWith('image/') ||
          mime === 'application/pdf';
        cb(null, !!ok);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(CHAT_UPLOADS)) mkdirSync(CHAT_UPLOADS, { recursive: true });
          cb(null, CHAT_UPLOADS);
        },
        filename: (_req, file, cb) => {
          const ext = (file.originalname && file.originalname.split('.').pop()) || '';
          const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext ? '.' + ext.replace(/[^a-zA-Z0-9]/g, '') : ''}`;
          cb(null, name);
        },
      }),
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('author') author?: string,
    @Body('content') content?: string,
    @Body('roomId') roomId?: string,
    @Body('userId') userId?: string,
    @CurrentUser() user?: ChatUser | null,
  ) {
    const uid = user?.id ?? userId ?? null;
    const authorStr = (user?.username ?? (author && String(author).trim())) || 'Anonymous';
    const contentStr = (content && String(content).trim()) || '';
    if (!file) {
      return { error: 'No file' };
    }
    const attachmentPath = `chat-uploads/${file.filename}`;
    const msg = await this.chatService.create(
      authorStr,
      contentStr,
      {
        path: attachmentPath,
        name: file.originalname || file.filename,
        mime: file.mimetype || '',
      },
      roomId || null,
      uid,
    );
    this.chatGateway.emitMessage(msg, roomId || null);
    return {
      id: msg.id,
      userId: msg.userId,
      author: msg.author,
      content: msg.content,
      createdAt: msg.createdAt,
      attachmentPath: msg.attachmentPath,
      attachmentName: msg.attachmentName,
      attachmentMime: msg.attachmentMime,
    };
  }
}
