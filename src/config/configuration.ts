export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },

  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',

    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  },
});
