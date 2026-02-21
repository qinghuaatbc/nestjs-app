import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

export type JwtPayload = { sub: string; username: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'chat-app-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.authService.findById(payload.sub);
      if (!user) throw new UnauthorizedException();
      return user;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      return null;
    }
  }
}
