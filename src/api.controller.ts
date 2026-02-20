import { Body, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ChatUser } from './chat/chat.entity';
import { AppService } from './app.service';

@Controller('api')
export class ApiController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('info')
  async getInfo() {
    const info = await this.appService.getIpInfo();
    let chatUsers: { id: string; username: string; createdAt: string | null }[] = [];
    let tables: string[] = [];
    try {
      const repo = this.dataSource.getRepository(ChatUser);
      const users = await repo.find({ order: { createdAt: 'ASC' } });
      chatUsers = users.map((u) => ({
        id: u.id,
        username: u.username,
        createdAt: u.createdAt == null ? null : (u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt)),
      }));
    } catch {
      // ignore
    }
    try {
      const rows = await this.dataSource.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
      );
      tables = (rows as { table_name: string }[]).map((r) => r.table_name);
    } catch {
      // ignore
    }
    return { ...info, chatUsers, tables };
  }

  @Get('tables')
  async getTables() {
    const rows = await this.dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const tables = (rows as { table_name: string }[]).map((r) => r.table_name);
    return { tables };
  }

  @Get('chatusers')
  async getChatUsers() {
    try {
      const repo = this.dataSource.getRepository(ChatUser);
      const users = await repo.find({ order: { createdAt: 'ASC' } });
      return users.map((u) => ({
        id: u.id,
        username: u.username,
        createdAt: u.createdAt == null ? null : (u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt)),
      }));
    } catch {
      return [];
    }
  }

  @Post('chatusers')
  async createChatUser(@Body() body: { username?: string }) {
    const name = (body?.username && String(body.username).trim()) || '';
    if (!name || name.length < 2) {
      throw new ConflictException('Username must be at least 2 characters');
    }
    if (name.length > 64) {
      throw new ConflictException('Username too long');
    }
    const repo = this.dataSource.getRepository(ChatUser);
    const existing = await repo.findOne({ where: { username: name.toLowerCase() } });
    if (existing) {
      throw new ConflictException('Username already taken');
    }
    const user = repo.create({ username: name.toLowerCase() });
    const saved = await repo.save(user);
    return {
      id: saved.id,
      username: saved.username,
      createdAt: saved.createdAt == null ? null : (saved.createdAt instanceof Date ? saved.createdAt.toISOString() : String(saved.createdAt)),
    };
  }
}
