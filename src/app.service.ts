import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome(): string {
    return 'Welcome to Swaadly API! We are glad to have you here.';
  }
}
