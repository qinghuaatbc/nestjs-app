import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChatUser } from '../chat/chat.entity';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: ChatUser) {
    return { id: user.id, username: user.username, email: user.email };
  }

  @Post('register')
  async register(
    @Body() body: { username?: string; password?: string; email?: string },
  ) {
    const { user, access_token } = await this.authService.register(
      body?.username ?? '',
      body?.password ?? '',
      body?.email,
    );
    return {
      access_token,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  @Post('login')
  async login(@Body() body: { username?: string; password?: string }) {
    const { user, access_token } = await this.authService.login(
      body?.username ?? '',
      body?.password ?? '',
    );
    return {
      access_token,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }
}
