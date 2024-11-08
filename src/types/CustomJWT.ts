import { JwtPayload } from "jsonwebtoken";

export interface CustomJWTPayload extends JwtPayload {
    username: string
}

export function isCustomJwtPayload(payload: JwtPayload | string): payload is CustomJWTPayload {
    return typeof payload === 'object' && payload !== null && 'username' in payload;
}