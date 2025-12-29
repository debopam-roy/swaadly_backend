import { Injectable, Logger } from '@nestjs/common';
import {
  CarrierRate,
  CarrierType,
  SelectionCriteria,
  CarrierPreference,
} from '../types';

@Injectable()
export class CarrierSelectorService {
  private readonly logger = new Logger(CarrierSelectorService.name);

  // Business rules for carrier selection
  // These preferences will be applied when selecting the best carrier
  private readonly regionalPreferences: CarrierPreference[] = [
    {
      // Pushpak for Rajasthan (ready for when Pushpak is integrated)
      pincodePrefixes: ['30', '31', '32', '33', '34'],
      states: ['Rajasthan'],
      preferredCarrier: CarrierType.PUSHPAK,
      priority: 1,
    },
    {
      // Delhivery for Delhi NCR (ready for when Delhivery is integrated)
      pincodePrefixes: ['11', '12', '13', '14', '20', '21'],
      states: ['Delhi', 'Haryana', 'Uttar Pradesh'],
      preferredCarrier: CarrierType.DELHIVERY,
      priority: 2,
    },
    // Add more regional preferences as needed
  ];

  /**
   * Select best carrier based on business rules
   * 1. Try regional preference first
   * 2. If no regional preference, score carriers based on price, speed, and reliability
   */
  selectBestCarrier(
    rates: CarrierRate[],
    criteria: SelectionCriteria,
  ): CarrierRate {
    if (rates.length === 0) {
      throw new Error('No carriers available');
    }

    // Single carrier - no need to select
    if (rates.length === 1) {
      this.logger.log(`Only one carrier available: ${rates[0].carrierName}`);
      return rates[0];
    }

    // 1. Try regional preference
    const regional = this.applyRegionalPreference(
      rates,
      criteria.deliveryPincode,
    );
    if (regional) {
      this.logger.log(
        `Selected ${regional.carrierName} (regional preference for pincode ${criteria.deliveryPincode})`,
      );
      return regional;
    }

    // 2. Score and select best overall
    const scored = this.scoreCarriers(rates, criteria);
    this.logger.log(
      `Selected ${scored[0].carrierName} (best score: ${scored[0].score.toFixed(2)})`,
    );

    return scored[0];
  }

  /**
   * Apply regional preferences based on delivery pincode
   */
  private applyRegionalPreference(
    rates: CarrierRate[],
    deliveryPincode: string,
  ): CarrierRate | null {
    // Sort preferences by priority (lower number = higher priority)
    const sorted = [...this.regionalPreferences].sort(
      (a, b) => a.priority - b.priority,
    );

    for (const pref of sorted) {
      for (const prefix of pref.pincodePrefixes) {
        if (deliveryPincode.startsWith(prefix)) {
          const preferred = rates.find(
            (r) => r.carrierType === pref.preferredCarrier,
          );
          if (preferred) {
            this.logger.debug(
              `Regional preference matched: ${pref.preferredCarrier} for pincode ${deliveryPincode}`,
            );
            return preferred;
          }
        }
      }
    }

    return null;
  }

  /**
   * Score carriers based on multiple factors
   */
  private scoreCarriers(
    rates: CarrierRate[],
    criteria: SelectionCriteria,
  ): (CarrierRate & { score: number })[] {
    const scored = rates.map((rate) => ({
      ...rate,
      score: this.calculateScore(rate, criteria),
    }));

    // Sort by score (lower is better)
    return scored.sort((a, b) => a.score - b.score);
  }

  /**
   * Calculate composite score for a carrier
   * Lower score is better
   */
  private calculateScore(
    rate: CarrierRate,
    criteria: SelectionCriteria,
  ): number {
    // Weights for different factors
    const PRICE_WEIGHT = 0.5; // 50% weight on price
    const SPEED_WEIGHT = 0.3; // 30% weight on delivery speed
    const RELIABILITY_WEIGHT = 0.2; // 20% weight on reliability

    // Price score (normalize to 0-100 scale)
    const priceScore = (rate.rate / 100) * 100;

    // Speed score (based on estimated delivery days)
    const avgDays = this.parseDeliveryDays(rate.estimatedDeliveryDays);
    const speedScore = avgDays * 20; // 1 day = 20 points, 5 days = 100 points

    // Reliability score (based on carrier reputation)
    const reliabilityScore = this.getReliabilityScore(rate.carrierType);

    // Calculate weighted score
    const finalScore =
      priceScore * PRICE_WEIGHT +
      speedScore * SPEED_WEIGHT +
      reliabilityScore * RELIABILITY_WEIGHT;

    this.logger.debug(
      `Score for ${rate.carrierName}: ${finalScore.toFixed(2)} (price: ${priceScore.toFixed(2)}, speed: ${speedScore.toFixed(2)}, reliability: ${reliabilityScore})`,
    );

    return finalScore;
  }

  /**
   * Parse delivery days string to average number
   * Examples: "3-5 days" -> 4, "2 days" -> 2
   */
  private parseDeliveryDays(deliveryString: string): number {
    const match = deliveryString.match(/(\d+)-?(\d+)?/);
    if (!match) return 5; // Default to 5 days if unable to parse

    const min = parseInt(match[1]);
    const max = match[2] ? parseInt(match[2]) : min;
    return (min + max) / 2;
  }

  /**
   * Get reliability score for carrier
   * Lower score = more reliable
   * These scores can be adjusted based on actual performance data
   */
  private getReliabilityScore(carrierType: CarrierType): number {
    const scores: Record<CarrierType, number> = {
      [CarrierType.PUSHPAK]: 10, // Most reliable for regional routes
      [CarrierType.DELHIVERY]: 15, // Good nationwide coverage
      [CarrierType.SHIPMOZO]: 20, // Aggregator - variable reliability
      [CarrierType.DTDC]: 25, // Standard reliability
    };

    return scores[carrierType] || 30;
  }

  /**
   * Add a custom regional preference at runtime
   */
  addRegionalPreference(preference: CarrierPreference): void {
    this.regionalPreferences.push(preference);
    this.logger.log(
      `Added regional preference for ${preference.preferredCarrier}`,
    );
  }

  /**
   * Get all regional preferences (for debugging/admin)
   */
  getRegionalPreferences(): CarrierPreference[] {
    return [...this.regionalPreferences];
  }
}
