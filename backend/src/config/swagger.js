/**
 * OpenAPI / Swagger configuration
 * Docs available at /api/docs
 */
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AlpacaParty API',
      version: '0.1.0',
      description: [
        'REST API for the AlpacaParty multiplayer game platform.',
        '',
        '## Authentication',
        'Most endpoints require a JWT access token in the `Authorization: Bearer <token>` header.',
        'Tokens are obtained from `POST /api/auth/login` or `POST /api/auth/register`.',
        'The public API uses `X-API-Key` instead.',
        '',
        '## Token refresh',
        'When an access token expires (24 h), call `POST /api/auth/refresh` with your refresh token to get a new one.',
      ].join('\n'),
    },
    servers: [{ url: '/api', description: 'Current server' }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from /auth/login or /auth/register',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for the public API endpoints',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            avatar: { type: 'string', nullable: true },
            bio: { type: 'string', nullable: true },
            status: { type: 'string', nullable: true },
            is_public: { type: 'boolean' },
            is_admin: { type: 'boolean' },
            is_online: { type: 'boolean' },
            xp: { type: 'integer' },
            level: { type: 'integer' },
            coins: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            content: { type: 'string' },
            image_url: { type: 'string', nullable: true },
            is_public: { type: 'boolean' },
            likes_count: { type: 'integer' },
            comments_count: { type: 'integer' },
            reposts_count: { type: 'integer' },
            author_id: { type: 'integer' },
            author_username: { type: 'string' },
            author_avatar: { type: 'string', nullable: true },
            user_liked: { type: 'boolean' },
            user_reposted: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        FriendRequest: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            senderId: { type: 'integer' },
            receiverId: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'accepted', 'declined'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
