import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { authenticateToken, generateAccessToken, generateRefreshToken } from '../middleware/authenticate';
import { EnvApp } from '../types/Bindings';
import { credentials } from '../types/authTypes';
import bcrypt from 'bcryptjs';
import { HTTPException } from 'hono/http-exception';
import { CustomJWTPayload } from '../types/CustomJWT';

const auth = new Hono<EnvApp>();

auth.post('/login', async (c) => {
	const { username, password }: credentials = await c.req.json();
	const query = `SELECT id, username, password from users WHERE username = ?`;
	const dbCredentials: credentials | null = await c.env.DB.prepare(query).bind(username).first();

	if (!dbCredentials) {
		return c.json({ error: 'No credentials found', status: 400 });
	}

	const compare = await bcrypt.compare(password, dbCredentials?.password);
	if (username === dbCredentials?.username && compare) {
		const userId = dbCredentials.id.toString();
		const accessToken = generateAccessToken(userId, c.env.ACCESS_TOKEN_SECRET, dbCredentials.username);
		const refreshToken = generateRefreshToken(userId, c.env.REFRESH_TOKEN_SECRET, dbCredentials.username);

		c.executionCtx.waitUntil(
			Promise.all([
				c.env.DB.prepare(`UPDATE users SET refreshToken = ? WHERE id = ?`).bind(refreshToken, userId).run(),
				c.env.kvCloudflare.put(username, accessToken),
			])
		);
		return c.json({ refreshToken, accessToken });
	}

	throw new HTTPException(401, {
		res: new Response('Invalid credentials', {
			status: 401,
			headers: {
				Authenticate: 'error="invalid_token"',
			},
		}),
	});
});

auth.post('/signup', async (c) => {
	const { username, password }: credentials = await c.req.json();

	//Find if there is an existing user in
	const query = 'SELECT username from users WHERE username = ?';
	const dbExist = await c.env.DB.prepare(query).bind(username).first();
	if (dbExist) {
		return c.json({ error: 'user exists' });
	}

	//Hash a password before saving it in the database;
	const hashPassword = await bcrypt.hash(password, 10);
	//Create the user:
	const createUser = await c.env.DB.prepare('INSERT INTO users (username, password) VALUES (?1, ?2)').bind(username, hashPassword).run();

	if (createUser.success) {
		return c.json({ message: 'Successfully created user' });
	}
	return c.json({ error: createUser.error });
});

//Route for refreshToken
auth.post('/token/refresh', async (c) => {
	const { user, token }: { user: string; token: string } = await c.req.json();

	// Check if the token and user are provided
	if (!token || !user) return c.text('No token or user', 401);

	// Check in the kv store if the token exists for the user
	const tokenValue = await c.env.kvCloudflare.get(user);
	if (!tokenValue) {
		return c.text('User does not have a token', 404);
	}

	// Verify the refresh token with the REFRESH_TOKEN_SECRET
	try {
		const decoded = jwt.verify(token, c.env.REFRESH_TOKEN_SECRET) as CustomJWTPayload

		if (typeof decoded.sub !== 'string') {
			throw new Error('Invalid token payload: sub is not a string');
		}

		// If the token is valid, generate a new access token
		const newAccessToken = generateAccessToken(decoded.sub, c.env.ACCESS_TOKEN_SECRET, decoded.username)

		//Save the new access token to the kv_cloudflare
		await c.env.kvCloudflare.put(user, newAccessToken);
		// Return the new access token
		return c.json({ accessToken: newAccessToken });
	} catch (err) {
		// Handle the error (e.g., invalid token)
		console.log('ERROR', err);
		return c.text('Invalid refresh token', 403);
	}
});

auth.post('/logout', authenticateToken, async (c) => {
	const { username }: { username: string } = await c.req.json();
	console.log(username);
	//remove the refreshToken from the database
	try {
		await c.env.DB.prepare(`UPDATE users SET refreshToken = NULL WHERE username = ?`).bind(username).run();
		await c.env.kvCloudflare.delete(username);
		return c.json({ message: 'Successfully logged out!' });
	} catch (err) {
		console.log('ERROR', err);
		return c.json({ err: err });
	}
});

auth.get('/allAccessToken', async (c) => {
	const list = await c.env.kvCloudflare.list();
	const userValues = await Promise.all(
		list.keys.map(async (key) => {
			const value = await c.env.kvCloudflare.get(key.name);
			return { key: key.name, value };
		})
	);

	return c.json(userValues);
});

auth.get('/protected', authenticateToken, (c) => {
	const id = c.get('userId');
	console.log(id);
	return c.text('TEST');
});

export default auth;
