export interface ITokenPayload {
  sub: string; // auth ID
  email?: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  iat?: number;
  exp?: number;
}

export interface IRefreshTokenPayload {
  sub: string; // auth ID
  sessionId: string;
  iat?: number;
  exp?: number;
}
