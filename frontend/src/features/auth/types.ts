export type User = {
  id: number;
  avatarUrl: string | null;
  displayName: string | null;
  email: string;
  mfaEnabled: boolean;
  username: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface LoginDto {
  username: string;
  password: string;
  code?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface MfaRequired {
  mfaRequired: true;
}

export type LoginResult = AuthTokens | MfaRequired;
