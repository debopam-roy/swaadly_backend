export enum OtpType {
  EMAIL = 'email',
  PHONE = 'phone',
}

export interface IOtpProvider {
  generateOtp(): string;
  sendOtp(recipient: string, code: string): Promise<void>;
}
