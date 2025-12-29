import { Injectable, Logger } from '@nestjs/common';
import { BaseCarrierAdapter } from '../adapters';
import { RateRequest, CarrierRate } from '../types';

@Injectable()
export class RateAggregatorService {
  private readonly logger = new Logger(RateAggregatorService.name);

  /**
   * Aggregate rates from all available carriers
   * Calls all carriers in parallel and returns combined results
   */
  async aggregateRates(
    carriers: BaseCarrierAdapter[],
    request: RateRequest,
  ): Promise<CarrierRate[]> {
    if (carriers.length === 0) {
      this.logger.warn('No carriers available for rate aggregation');
      return [];
    }

    this.logger.log(
      `Aggregating rates from ${carriers.length} carrier(s) for route ${request.pickupPincode} -> ${request.deliveryPincode}`,
    );

    // Call all carriers in parallel for better performance
    const ratePromises = carriers.map(async (carrier) => {
      try {
        // First check serviceability
        const serviceable = await carrier.checkServiceability(
          request.pickupPincode,
          request.deliveryPincode,
        );

        if (!serviceable) {
          this.logger.debug(
            `${carrier.carrierName} does not service this route`,
          );
          return [];
        }

        // Get rates from carrier
        const rates = await carrier.getRates(request);
        this.logger.debug(
          `${carrier.carrierName} returned ${rates.length} rate(s)`,
        );
        return rates;
      } catch (error) {
        // Log error but don't fail the entire aggregation
        this.logger.error(
          `Failed to get rates from ${carrier.carrierName}: ${error.message}`,
        );
        return [];
      }
    });

    // Wait for all carriers to respond
    const allRates = await Promise.all(ratePromises);

    // Flatten the array of arrays into single array
    const flattenedRates = allRates.flat();

    this.logger.log(
      `Aggregated ${flattenedRates.length} total rate(s) from ${carriers.length} carrier(s)`,
    );

    // Sort by rate (cheapest first) for convenience
    return flattenedRates.sort((a, b) => a.rate - b.rate);
  }

  /**
   * Get rates from a specific carrier only
   */
  async getRatesFromCarrier(
    carrier: BaseCarrierAdapter,
    request: RateRequest,
  ): Promise<CarrierRate[]> {
    try {
      const serviceable = await carrier.checkServiceability(
        request.pickupPincode,
        request.deliveryPincode,
      );

      if (!serviceable) {
        this.logger.warn(`${carrier.carrierName} does not service this route`);
        return [];
      }

      const rates = await carrier.getRates(request);
      this.logger.log(
        `${carrier.carrierName} returned ${rates.length} rate(s)`,
      );
      return rates;
    } catch (error) {
      this.logger.error(
        `Failed to get rates from ${carrier.carrierName}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Get the cheapest rate from all carriers
   */
  async getCheapestRate(
    carriers: BaseCarrierAdapter[],
    request: RateRequest,
  ): Promise<CarrierRate | null> {
    const rates = await this.aggregateRates(carriers, request);

    if (rates.length === 0) {
      return null;
    }

    // Already sorted by price, so first one is cheapest
    return rates[0];
  }

  /**
   * Get the fastest delivery option from all carriers
   */
  async getFastestRate(
    carriers: BaseCarrierAdapter[],
    request: RateRequest,
  ): Promise<CarrierRate | null> {
    const rates = await this.aggregateRates(carriers, request);

    if (rates.length === 0) {
      return null;
    }

    // Sort by delivery days
    const sorted = rates.sort((a, b) => {
      const daysA = this.parseDeliveryDays(a.estimatedDeliveryDays);
      const daysB = this.parseDeliveryDays(b.estimatedDeliveryDays);
      return daysA - daysB;
    });

    return sorted[0];
  }

  /**
   * Parse delivery days from string
   */
  private parseDeliveryDays(deliveryString: string): number {
    const match = deliveryString.match(/(\d+)-?(\d+)?/);
    if (!match) return 999; // Return high number if unable to parse

    const min = parseInt(match[1]);
    const max = match[2] ? parseInt(match[2]) : min;
    return (min + max) / 2;
  }
}
