import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { ChatRoom } from './chat-room.entity';
import { ChatMessage, ChatUser } from './chat.entity';

const DEFAULT_ROOM_NAME = 'General';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
    @InjectRepository(ChatUser)
    private readonly userRepo: Repository<ChatUser>,
    @InjectRepository(ChatRoom)
    private readonly roomRepo: Repository<ChatRoom>,
  ) {}

  async ensureDefaultRoom(): Promise<ChatRoom> {
    let room = await this.roomRepo.findOne({ where: { name: DEFAULT_ROOM_NAME } });
    if (!room) {
      room = this.roomRepo.create({ name: DEFAULT_ROOM_NAME });
      room = await this.roomRepo.save(room);
    }
    return room;
  }

  async createRoom(name: string): Promise<ChatRoom> {
    const n = (name || '').trim();
    if (!n || n.length < 1) throw new ConflictException('Room name required');
    if (n.length > 128) throw new ConflictException('Room name too long');
    const existing = await this.roomRepo.findOne({ where: { name: n } });
    if (existing) throw new ConflictException('Room name already exists');
    const room = this.roomRepo.create({ name: n });
    return this.roomRepo.save(room);
  }

  async listRooms(): Promise<ChatRoom[]> {
    await this.ensureDefaultRoom();
    return this.roomRepo.find({ order: { createdAt: 'ASC' } });
  }

  async create(
    author: string,
    content: string,
    attachment?: { path: string; name: string; mime: string },
    roomId?: string | null,
    userId?: string | null,
  ): Promise<ChatMessage> {
    let authorStr = author || 'Anonymous';
    let userIdVal: string | null = null;
    if (userId && String(userId).trim()) {
      const user = await this.userRepo.findOne({ where: { id: userId.trim() } });
      if (user) {
        userIdVal = user.id;
        authorStr = user.username;
      }
    }
    const msg = this.repo.create({
      roomId: roomId ?? null,
      userId: userIdVal,
      author: authorStr,
      content: content || '',
      attachmentPath: attachment?.path ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentMime: attachment?.mime ?? null,
    });
    return this.repo.save(msg);
  }

  async findRecent(roomId?: string | null, limit = 100): Promise<ChatMessage[]> {
    const take = Math.min(Math.max(limit, 1), 500);
    const where = roomId != null && roomId !== '' ? { roomId } : {};
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      take,
    });
  }

  async register(username: string): Promise<ChatUser> {
    const name = (username || '').trim();
    if (!name || name.length < 2) {
      throw new ConflictException('Username must be at least 2 characters');
    }
    if (name.length > 64) {
      throw new ConflictException('Username too long');
    }
    const existing = await this.userRepo.findOne({
      where: { username: name.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Username already taken');
    }
    const user = this.userRepo.create({ username: name.toLowerCase() });
    return this.userRepo.save(user);
  }

  async findByUsername(username: string): Promise<ChatUser | null> {
    const name = (username || '').trim().toLowerCase();
    if (!name) return null;
    return this.userRepo.findOne({ where: { username: name } });
  }

  async listUsers(): Promise<ChatUser[]> {
    return this.userRepo.find({ order: { createdAt: 'ASC' } });
  }

  async deleteMessage(
    messageId: string,
    author?: string | null,
    userId?: string | null,
  ): Promise<{ roomId: string | null }> {
    const msg = await this.repo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    const authorMatch = author != null && author !== '' && (msg.author || '').toLowerCase() === (author || '').trim().toLowerCase();
    const userMatch = userId != null && userId !== '' && msg.userId != null && msg.userId === String(userId).trim();
    if (!authorMatch && !userMatch) throw new ForbiddenException('Only the sender can delete this message');
    if (msg.attachmentPath) {
      try {
        const fullPath = join(process.cwd(), 'public', msg.attachmentPath);
        await unlink(fullPath);
      } catch {
        // ignore file delete errors (e.g. already missing)
      }
    }
    await this.repo.remove(msg);
    return { roomId: msg.roomId };
  }
}
