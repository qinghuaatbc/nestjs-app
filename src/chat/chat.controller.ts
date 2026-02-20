import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

const CHAT_UPLOADS = join(process.cwd(), 'public', 'chat-uploads');

@Controller('api/chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('rooms')
  getRooms() {
    return this.chatService.listRooms();
  }

  @Post('rooms')
  async addRoom(@Body() body: { name?: string }) {
    const name = (body?.name && String(body.name).trim()) || '';
    const room = await this.chatService.createRoom(name);
    return { id: room.id, name: room.name, createdAt: room.createdAt };
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

  @Post('register')
  async register(@Body() body: { username?: string }) {
    const user = await this.chatService.register(body?.username ?? '');
    return { id: user.id, username: user.username };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
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
  ) {
    const authorStr = (author && String(author).trim()) || 'Anonymous';
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
      userId || null,
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
