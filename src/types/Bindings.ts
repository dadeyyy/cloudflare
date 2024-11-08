export type EnvApp = {
	Bindings: {
		DB: D1Database;
		REFRESH_TOKEN_SECRET: string;
		ACCESS_TOKEN_SECRET: string;
		kvCloudflare: KVNamespace;
	};
};