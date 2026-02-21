import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ChatUser } from '../../chat/chat.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ChatUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: ChatUser }>();
    return request.user as ChatUser;
  },
);
