import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.findPublicUser(user.id);
  }

  @Get()
  list() {
    return this.users.list();
  }
}
