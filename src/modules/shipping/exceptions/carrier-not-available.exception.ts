import { HttpException, HttpStatus } from '@nestjs/common';

export class CarrierNotAvailableException extends HttpException {
  constructor(message: string = 'No carriers available for this route') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
