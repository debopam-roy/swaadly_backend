export interface InitiateAuthResponse {
  message: string;
  requiresOtp: boolean;
  otpSentTo?: string;
  nextStep?: string;
  userId?: string;
}

export interface VerifyAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string;
    phone?: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  requiresPhoneVerification?: boolean;
}

export interface IAuthStrategy {
  initiateAuth(data: any): Promise<InitiateAuthResponse>;
  verifyAuth(data: any): Promise<VerifyAuthResponse>;
}
