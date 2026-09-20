export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: number;
  username: string;
  sid: string;
  jti: string;
  typ: TokenType;
  exp?: number;
}

export interface AuthUser {
  userId: number;
  username: string;
  sid: string;
  jti: string;
  exp: number;
}
