/**
 * OpenAPI / Swagger configuration
 * UI available at /api/docs
 */
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AlpacaParty API',
      version: '0.1.0',
      description: `
REST API for the **AlpacaParty** multiplayer social platform.

## Quick start
1. Call **POST /auth/register** or **POST /auth/login**
2. Copy the \`accessToken\` from the response
3. Click **Authorize 🔒** at the top of this page and paste it
4. All protected endpoints will now include your token automatically

## Authentication
Most endpoints require a JWT access token:
\`\`\`
Authorization: Bearer <accessToken>
\`\`\`
Access tokens expire after **24 h**. Use **POST /auth/refresh** with your \`refreshToken\` to get a new pair.

## Public API
The \`/public/*\` group uses an **X-API-Key** header instead of JWT — intended for server-to-server integrations.

## Rate limits
| Scope | Limit |
|---|---|
| Global | 1 000 req / 15 min |
| Auth endpoints | 50 req / 15 min per IP |
| Admin endpoints | 60 req / min |
| AI help chat | 20 req / min |
| Public API | 100 req / min |
      `.trim(),
    },
    servers: [{ url: '/api', description: 'AlpacaParty backend' }],
    tags: [
      { name: 'Auth',          description: 'Register, login, OAuth (Google / GitHub), token refresh' },
      { name: 'Users',         description: 'Profile management, password, GDPR export/deletion, AI image generation' },
      { name: 'Friends',       description: 'Friend requests, online list, blocking' },
      { name: 'Posts',         description: 'Social feed — create, like, comment, repost' },
      { name: 'Chat',          description: 'Direct messages and group chat rooms' },
      { name: 'Game',          description: 'Stats, match history, leaderboard, alpaca farm, achievements' },
      { name: 'Notifications', description: 'In-app notification inbox' },
      { name: 'Organizations', description: 'Create and manage organizations / teams' },
      { name: 'Uploads',       description: 'File upload and management (images, PDFs, CSV…)' },
      { name: 'Admin',         description: '🔐 Admin only — user management, site stats, GDPR processing' },
      { name: 'Public API',    description: '🔑 API-key auth — read-only, anonymized data for external integrations' },
      { name: 'Help',          description: 'AI-powered help desk (Llama 3.3 70B via Groq)' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from **POST /auth/login**. Expires in 24 h.',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for **/public/*** endpoints',
        },
      },
      parameters: {
        limitParam: {
          in: 'query', name: 'limit',
          schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          description: 'Max results to return',
        },
        offsetParam: {
          in: 'query', name: 'offset',
          schema: { type: 'integer', default: 0, minimum: 0 },
          description: 'Results to skip (for pagination)',
        },
        anonymizedParam: {
          in: 'query', name: 'anonymized',
          schema: { type: 'string', enum: ['true', 'false', '1', '0', 'yes', 'no'], default: 'false' },
          description: 'Replace real usernames/avatars/content with placeholder values',
        },
      },
      schemas: {
        // ─── Users ─────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 42 },
            username:    { type: 'string',  example: 'alpaca42' },
            email:       { type: 'string',  format: 'email', example: 'alpaca@example.com' },
            avatar:      { type: 'string',  nullable: true, example: '/uploads/avatar-42.png' },
            bio:         { type: 'string',  nullable: true, example: 'I love alpacas!' },
            status:      { type: 'string',  nullable: true, example: 'Playing Spit Royale' },
            is_public:   { type: 'boolean', example: true },
            is_admin:    { type: 'boolean', example: false },
            is_online:   { type: 'boolean', example: true },
            xp:          { type: 'integer', example: 1500 },
            level:       { type: 'integer', example: 5 },
            coins:       { type: 'integer', example: 250 },
            created_at:  { type: 'string',  format: 'date-time' },
          },
        },
        // ─── Posts / Social ────────────────────────────────────────
        Post: {
          type: 'object',
          properties: {
            id:              { type: 'integer', example: 1 },
            content:         { type: 'string',  example: 'Just won my first Spit Royale game! 🏆' },
            image_url:       { type: 'string',  nullable: true },
            is_public:       { type: 'boolean', example: true },
            likes_count:     { type: 'integer', example: 5 },
            comments_count:  { type: 'integer', example: 2 },
            reposts_count:   { type: 'integer', example: 1 },
            author_id:       { type: 'integer', example: 42 },
            author_username: { type: 'string',  example: 'alpaca42' },
            author_avatar:   { type: 'string',  nullable: true },
            user_liked:      { type: 'boolean', example: false },
            user_reposted:   { type: 'boolean', example: false },
            created_at:      { type: 'string',  format: 'date-time' },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            id:              { type: 'integer', example: 10 },
            post_id:         { type: 'integer', example: 1 },
            author_id:       { type: 'integer', example: 42 },
            author_username: { type: 'string',  example: 'alpaca42' },
            author_avatar:   { type: 'string',  nullable: true },
            content:         { type: 'string',  example: 'Great game!' },
            created_at:      { type: 'string',  format: 'date-time' },
          },
        },
        // ─── Friends ───────────────────────────────────────────────
        FriendRequest: {
          type: 'object',
          properties: {
            id:         { type: 'integer', example: 7 },
            senderId:   { type: 'integer', example: 42 },
            receiverId: { type: 'integer', example: 99 },
            status:     { type: 'string',  enum: ['pending', 'accepted', 'declined'], example: 'pending' },
            createdAt:  { type: 'string',  format: 'date-time' },
          },
        },
        // ─── Game ──────────────────────────────────────────────────
        GameStats: {
          type: 'object',
          properties: {
            userId:   { type: 'integer', example: 42 },
            gameType: { type: 'string',  example: 'spit_royale' },
            wins:     { type: 'integer', example: 10 },
            losses:   { type: 'integer', example: 5 },
            draws:    { type: 'integer', example: 2 },
            elo:      { type: 'integer', example: 1150 },
          },
        },
        Achievement: {
          type: 'object',
          properties: {
            key:         { type: 'string',  example: 'first_win' },
            name:        { type: 'string',  example: 'First Blood' },
            description: { type: 'string',  example: 'Win your first game' },
            icon:        { type: 'string',  example: '🏆' },
            xpReward:    { type: 'integer', example: 50 },
            unlocked:    { type: 'boolean', example: false },
          },
        },
        // ─── Chat ──────────────────────────────────────────────────
        ChatRoom: {
          type: 'object',
          properties: {
            id:        { type: 'integer', example: 3 },
            name:      { type: 'string',  example: 'Alpaca Gamers' },
            ownerId:   { type: 'integer', example: 42 },
            isPrivate: { type: 'boolean', example: false },
            createdAt: { type: 'string',  format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 55 },
            sender_id:   { type: 'integer', example: 42 },
            receiver_id: { type: 'integer', example: 99 },
            content:     { type: 'string',  example: 'GG!' },
            is_read:     { type: 'boolean', example: false },
            created_at:  { type: 'string',  format: 'date-time' },
          },
        },
        // ─── Organizations ─────────────────────────────────────────
        Organization: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 1 },
            name:        { type: 'string',  example: 'AlpacaSquad' },
            description: { type: 'string',  nullable: true, example: 'The best alpaca gamers' },
            avatar:      { type: 'string',  nullable: true },
            ownerId:     { type: 'integer', example: 42 },
            created_at:  { type: 'string',  format: 'date-time' },
          },
        },
        // ─── Notifications ─────────────────────────────────────────
        Notification: {
          type: 'object',
          properties: {
            id:            { type: 'integer', example: 12 },
            type:          { type: 'string',  enum: ['friend_request','friend_accepted','game_invite','org_invite','achievement','post_like','message','data_request'] },
            title:         { type: 'string',  example: 'New friend request' },
            message:       { type: 'string',  example: 'alpaca42 sent you a friend request' },
            isRead:        { type: 'boolean', example: false },
            referenceType: { type: 'string',  nullable: true, example: 'friend_request' },
            referenceId:   { type: 'integer', nullable: true, example: 7 },
            created_at:    { type: 'string',  format: 'date-time' },
          },
        },
        // ─── Uploads ───────────────────────────────────────────────
        UploadedFile: {
          type: 'object',
          properties: {
            id:           { type: 'integer', example: 9 },
            url:          { type: 'string',  example: '/uploads/1712345678-abc123.png' },
            originalName: { type: 'string',  example: 'screenshot.png' },
            mimeType:     { type: 'string',  example: 'image/png' },
            sizeBytes:    { type: 'integer', example: 204800 },
            created_at:   { type: 'string',  format: 'date-time' },
          },
        },
        // ─── Errors ────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: { message: { type: 'string', example: 'Something went wrong' } },
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Validation failed' },
                fields: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                  example: { userId: 'userId must be a positive integer' },
                },
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
