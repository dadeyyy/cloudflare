import { Context, Hono, Next } from 'hono';
import auth from './routes/auth';
import expenses from './routes/expenses'
import { logger } from 'hono/logger';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { EnvApp } from './types/Bindings';
import budget from './routes/budget';

const app = new Hono<EnvApp>();

app.use('*', logger());
app.route('/auth', auth);
app.route('/', expenses);
app.route('/', budget);

app.onError((err, c) => {
	if(err instanceof HTTPException){
		return c.json({success: false, message: err.message}, err.status)
	}
	return c.json(err.message);
});


export default app;