import { HttpException, HttpStatus } from '@nestjs/common';

export class ShipmentCreationFailedException extends HttpException {
  constructor(
    message: string = 'Failed to create shipment',
    public readonly carrierError?: any,
  ) {
    super(
      {
        message,
        carrierError,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
