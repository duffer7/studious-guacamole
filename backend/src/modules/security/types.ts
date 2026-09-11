/** Payload stored inside the access/refresh JWT. */
export interface JwtPayload {
  sub: number;
  username: string;
}

/** Shape attached to `req.user` after `JwtAuthGuard` runs. */
export interface AuthUser {
  userId: number;
  username: string;
}
