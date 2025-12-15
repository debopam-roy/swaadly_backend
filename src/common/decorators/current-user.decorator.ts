import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ITokenPayload } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (data: keyof ITokenPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
