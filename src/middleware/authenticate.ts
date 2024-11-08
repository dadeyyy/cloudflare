import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { JWTPayload } from 'hono/utils/jwt/types';
import jwt from 'jsonwebtoken';
import { CustomJWTPayload, isCustomJwtPayload } from '../types/CustomJWT';

declare module 'hono' {
	interface ContextVariableMap {
		userId: string;
		username: string;
	}
}

export const authenticateToken = createMiddleware(async (c, next) => {
	const header = c.req.header('Authorization');
	if (!header) {
		return c.json({ error: 'No header provided', status: 404 });
	}
	const token = header.split(' ')[1];

	//Verify if the token is authenticated
	if (!token) {
		return c.json({ error: 'Token not found', status: 404 });
	}

	try{
		const user = jwt.verify(token, c.env.ACCESS_TOKEN_SECRET) as CustomJWTPayload
			c.set('userId', user.sub as string);
			c.set('username', user.username);
			await next();
	}
	catch (err) {
        console.log('ERROR:', err);
        return c.json({ error: "Invalid token", details: err });
    }
});

export const generateRefreshToken = (userId: string, REFRESH_TOKEN_SECRET: string, username: string) => {
	const refreshToken = jwt.sign({ sub: userId, username } as CustomJWTPayload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
	return refreshToken;
};

export const generateAccessToken = (userId: string, ACCESS_TOKEN_SECRET: string, username: string) => {
	const accessToken = jwt.sign({ sub: userId, username } as CustomJWTPayload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
	return accessToken;
};
