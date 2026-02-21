import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { ChatFriend } from './chat-friend.entity';
import { ChatRoom } from './chat-room.entity';
import { ChatRoomMember } from './chat-room-member.entity';
import { ChatMessage, ChatUser } from './chat.entity';

const DEFAULT_ROOM_NAME = 'General';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
    @InjectRepository(ChatUser)
    private readonly userRepo: Repository<ChatUser>,
    @InjectRepository(ChatRoom)
    private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatRoomMember)
    private readonly memberRepo: Repository<ChatRoomMember>,
    @InjectRepository(ChatFriend)
    private readonly friendRepo: Repository<ChatFriend>,
  ) {}

  async ensureDefaultRoom(): Promise<ChatRoom> {
    let room = await this.roomRepo.findOne({ where: { name: DEFAULT_ROOM_NAME } });
    if (!room) {
      room = this.roomRepo.create({ name: DEFAULT_ROOM_NAME });
      room = await this.roomRepo.save(room);
    }
    return room;
  }

  async createRoom(name: string, creatorUserId?: string | null): Promise<ChatRoom> {
    const n = (name || '').trim();
    if (!n || n.length < 1) throw new ConflictException('Room name required');
    if (n.length > 128) throw new ConflictException('Room name too long');
    const existing = await this.roomRepo.findOne({ where: { name: n } });
    if (existing) throw new ConflictException('Room name already exists');
    const room = this.roomRepo.create({ name: n });
    const saved = await this.roomRepo.save(room);
    if (creatorUserId) await this.addMember(saved.id, creatorUserId);
    return saved;
  }

  async addMember(roomId: string, userId: string): Promise<ChatRoomMember> {
    const existing = await this.memberRepo.findOne({ where: { roomId, userId } });
    if (existing) return existing;
    const member = this.memberRepo.create({ roomId, userId });
    return this.memberRepo.save(member);
  }

  async listRooms(): Promise<ChatRoom[]> {
    try {
      await this.ensureDefaultRoom();
      return await this.roomRepo.find({ order: { createdAt: 'ASC' } });
    } catch (e) {
      this.logger.warn('listRooms failed', e instanceof Error ? e.message : e);
      return [];
    }
  }

  async listRoomsForUser(userId: string): Promise<ChatRoom[]> {
    try {
      const members = await this.memberRepo.find({
        where: { userId },
        relations: ['room'],
        order: { joinedAt: 'DESC' },
      });
      const rooms = members.map((m) => m.room).filter(Boolean);
      const roomIds = new Set(rooms.map((r) => r.id));
      const allRooms = await this.listRooms();
      const general = allRooms.find((r) => r.name === DEFAULT_ROOM_NAME);
      if (general && !roomIds.has(general.id)) rooms.unshift(general);
      return rooms;
    } catch (e) {
      this.logger.warn('listRoomsForUser failed', e instanceof Error ? e.message : e);
      return [];
    }
  }

  /** Get or create a 1-to-1 conversation room between two users. */
  async getOrCreate1To1Room(userId1: string, userId2: string): Promise<ChatRoom> {
    if (userId1 === userId2) throw new ConflictException('Cannot create chat with yourself');
    const [u1, u2] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId1 } }),
      this.userRepo.findOne({ where: { id: userId2 } }),
    ]);
    if (!u1 || !u2) throw new NotFoundException('User not found');
    const members1 = await this.memberRepo.find({ where: { userId: userId1 } });
    const roomIds1 = new Set(members1.map((m) => m.roomId));
    for (const roomId of roomIds1) {
      const count = await this.memberRepo.count({ where: { roomId } });
      if (count !== 2) continue;
      const both = await this.memberRepo.find({ where: { roomId } });
      const userIds = new Set(both.map((m) => m.userId));
      if (userIds.has(userId1) && userIds.has(userId2)) {
        const room = await this.roomRepo.findOne({ where: { id: roomId } });
        if (room) return room;
      }
    }
    const name = `Direct: ${u1.username}, ${u2.username}`;
    const room = this.roomRepo.create({ name });
    const saved = await this.roomRepo.save(room);
    await this.addMember(saved.id, userId1);
    await this.addMember(saved.id, userId2);
    return saved;
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

  async addFriendRequest(userId: string, friendId: string): Promise<ChatFriend> {
    if (userId === friendId) throw new ConflictException('Cannot add yourself');
    const friend = await this.userRepo.findOne({ where: { id: friendId } });
    if (!friend) throw new NotFoundException('User not found');
    const existing = await this.friendRepo.findOne({ where: { userId, friendId } });
    if (existing) throw new ConflictException('Already sent or friends');
    const reverse = await this.friendRepo.findOne({ where: { userId: friendId, friendId: userId } });
    if (reverse?.status === 'accepted') throw new ConflictException('Already friends');
    if (reverse?.status === 'pending') {
      reverse.status = 'accepted';
      await this.friendRepo.save(reverse);
      const link = this.friendRepo.create({ userId, friendId, status: 'accepted' });
      return this.friendRepo.save(link);
    }
    const link = this.friendRepo.create({ userId, friendId, status: 'pending' });
    return this.friendRepo.save(link);
  }

  async acceptFriendRequest(userId: string, friendId: string): Promise<ChatFriend> {
    const row = await this.friendRepo.findOne({ where: { userId: friendId, friendId: userId } });
    if (!row || row.status !== 'pending') throw new NotFoundException('No pending request');
    row.status = 'accepted';
    await this.friendRepo.save(row);
    const reverse = await this.friendRepo.findOne({ where: { userId, friendId } });
    if (reverse) return reverse;
    const link = this.friendRepo.create({ userId, friendId, status: 'accepted' });
    return this.friendRepo.save(link);
  }

  async listFriends(userId: string): Promise<ChatUser[]> {
    const rows = await this.friendRepo.find({
      where: [{ userId, status: 'accepted' }, { friendId: userId, status: 'accepted' }],
      relations: ['friend', 'user'],
    });
    const ids = new Set<string>();
    const users: ChatUser[] = [];
    for (const r of rows) {
      const other = r.userId === userId ? r.friend : r.user;
      if (other && !ids.has(other.id)) {
        ids.add(other.id);
        users.push(other);
      }
    }
    return users;
  }

  async listPendingReceived(userId: string): Promise<ChatUser[]> {
    const rows = await this.friendRepo.find({
      where: { friendId: userId, status: 'pending' },
      relations: ['user'],
    });
    return rows.map((r) => r.user).filter(Boolean);
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
