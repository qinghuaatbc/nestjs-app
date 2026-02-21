import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ChatUser } from '../chat/chat.entity';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(ChatUser)
    private readonly userRepo: Repository<ChatUser>,
    private readonly jwtService: JwtService,
  ) {}

  async register(username: string, password: string, email?: string): Promise<{ user: ChatUser; access_token: string }> {
    const name = (username || '').trim().toLowerCase();
    if (!name || name.length < 2) throw new ConflictException('Username must be at least 2 characters');
    if (name.length > 64) throw new ConflictException('Username too long');
    if (!password || password.length < 6) throw new ConflictException('Password must be at least 6 characters');

    const existing = await this.userRepo.findOne({ where: { username: name } });
    if (existing) throw new ConflictException('Username already taken');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = this.userRepo.create({
      username: name,
      passwordHash,
      email: email?.trim() || null,
    });
    const saved = await this.userRepo.save(user);
    const token = this.jwtService.sign({ sub: saved.id, username: saved.username });
    return { user: saved, access_token: token };
  }

  async validateUser(username: string, password: string): Promise<ChatUser | null> {
    const name = (username || '').trim().toLowerCase();
    if (!name) return null;
    const user = await this.userRepo.findOne({ where: { username: name } });
    if (!user || !user.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(username: string, password: string): Promise<{ user: ChatUser; access_token: string }> {
    const user = await this.validateUser(username, password);
    if (!user) throw new UnauthorizedException('Invalid username or password');
    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { user, access_token: token };
  }

  async findById(id: string): Promise<ChatUser | null> {
    if (!id) return null;
    return this.userRepo.findOne({ where: { id } });
  }
}
