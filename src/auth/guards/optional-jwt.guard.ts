import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Does not fail when no/invalid token; request.user set only when valid JWT is sent. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const result = super.canActivate(context);
    if (typeof (result as Promise<boolean>)?.then === 'function') {
      return (result as Promise<boolean>).then(() => true).catch(() => true);
    }
    return (result as Observable<boolean>).pipe(catchError(() => of(true)));
  }

  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return user ?? (null as TUser);
  }
}
