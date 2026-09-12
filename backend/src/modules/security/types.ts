export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: number;
  username: string;
  sid: string;
  jti: string;
  typ: TokenType;
  /** Заполняется автоматически из `expiresIn`. Unix-секунды. */
  exp?: number;
}

export interface AuthUser {
  userId: number;
  username: string;
  sid: string;
  jti: string;
  exp: number;
}
