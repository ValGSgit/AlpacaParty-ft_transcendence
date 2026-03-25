<!--
  API Documentation — Complete reference for all AlpacaParty API endpoints
  @owner ValGSgit
-->
<template>
  <div class="docs-page">
    <h1>API Documentation</h1>
    <p class="subtitle">
      Complete reference for all AlpacaParty REST API endpoints.
      Base URL: <code>/api</code>
    </p>

    <!-- Quick nav -->
    <nav class="docs-nav">
      <a
        v-for="section in sections"
        :key="section.id"
        class="nav-pill"
        :href="'#' + section.id"
      >{{ section.label }}</a>
    </nav>

    <!-- Sections -->
    <section v-for="section in sections" :key="section.id" :id="section.id" class="endpoint-section">
      <h2>{{ section.label }}</h2>
      <p class="section-desc">{{ section.description }}</p>

      <div v-if="section.auth" class="auth-badge">
        <span v-if="section.auth === 'jwt'" class="badge badge-auth">Requires JWT</span>
        <span v-if="section.auth === 'admin'" class="badge badge-admin">Admin Only</span>
        <span v-if="section.auth === 'apikey'" class="badge badge-apikey">API Key Required</span>
        <span v-if="section.rateLimit" class="badge badge-rate">{{ section.rateLimit }}</span>
      </div>

      <div v-for="ep in section.endpoints" :key="ep.method + ep.path" class="endpoint-card">
        <div class="endpoint-header">
          <span :class="['method-badge', `method-${ep.method.toLowerCase()}`]">{{ ep.method }}</span>
          <code class="endpoint-path">{{ ep.path }}</code>
        </div>
        <p class="endpoint-desc">{{ ep.description }}</p>

        <div v-if="ep.params" class="endpoint-detail">
          <h4>Parameters</h4>
          <table class="param-table">
            <thead><tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
            <tbody>
              <tr v-for="p in ep.params" :key="p.name">
                <td><code>{{ p.name }}</code></td>
                <td>{{ p.in }}</td>
                <td>{{ p.type }}</td>
                <td>{{ p.required ? 'Yes' : 'No' }}</td>
                <td>{{ p.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="ep.body" class="endpoint-detail">
          <h4>Request Body</h4>
          <table class="param-table">
            <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
            <tbody>
              <tr v-for="b in ep.body" :key="b.name">
                <td><code>{{ b.name }}</code></td>
                <td>{{ b.type }}</td>
                <td>{{ b.required ? 'Yes' : 'No' }}</td>
                <td>{{ b.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="ep.response" class="endpoint-detail">
          <h4>Response</h4>
          <pre class="response-block">{{ ep.response }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>

const sections = [
  {
    id: 'health',
    label: 'Health',
    description: 'Server health check endpoint. No authentication required.',
    auth: null,
    endpoints: [
      {
        method: 'GET', path: '/api/health',
        description: 'Returns server status, version, and timestamp.',
        response: '{ "status": "ok", "message": "AlpacaParty backend is running", "timestamp": "...", "version": "0.1.0" }',
      },
    ],
  },
  {
    id: 'auth',
    label: 'Authentication',
    description: 'User registration, login, token refresh, and OAuth flows.',
    auth: null,
    endpoints: [
      {
        method: 'POST', path: '/api/auth/register',
        description: 'Register a new user account.',
        body: [
          { name: 'username', type: 'string', required: true, desc: '3-32 chars, alphanumeric + hyphens/underscores' },
          { name: 'email', type: 'string', required: true, desc: 'Valid email address' },
          { name: 'password', type: 'string', required: true, desc: 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number' },
        ],
        response: '{ "user": { ... }, "accessToken": "...", "refreshToken": "..." }',
      },
      {
        method: 'POST', path: '/api/auth/login',
        description: 'Authenticate with username (or email) and password.',
        body: [
          { name: 'username', type: 'string', required: true, desc: 'Username or email' },
          { name: 'password', type: 'string', required: true, desc: 'Account password' },
        ],
        response: '{ "user": { ... }, "accessToken": "...", "refreshToken": "..." }',
      },
      {
        method: 'POST', path: '/api/auth/logout',
        description: 'Log out the current user and set offline status. Requires JWT.',
        response: '{ "message": "Logged out" }',
      },
      {
        method: 'POST', path: '/api/auth/refresh',
        description: 'Exchange a valid refresh token for a new access + refresh token pair.',
        body: [
          { name: 'refreshToken', type: 'string', required: true, desc: 'Current refresh token' },
        ],
        response: '{ "accessToken": "...", "refreshToken": "..." }',
      },
      {
        method: 'GET', path: '/api/auth/me',
        description: 'Get the currently authenticated user profile. Requires JWT.',
        response: '{ "user": { ... } }',
      },
      {
        method: 'GET', path: '/api/auth/google',
        description: 'Initiate Google OAuth 2.0 login flow. Redirects to Google.',
      },
      {
        method: 'GET', path: '/api/auth/google/callback',
        description: 'Google OAuth callback. Redirects to frontend with tokens.',
      },
      {
        method: 'GET', path: '/api/auth/github',
        description: 'Initiate GitHub OAuth login flow. Redirects to GitHub.',
      },
      {
        method: 'GET', path: '/api/auth/github/callback',
        description: 'GitHub OAuth callback. Redirects to frontend with tokens.',
      },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    description: 'User profile management, data export, and account operations.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'GET', path: '/api/users/me',
        description: 'Get the authenticated user\'s full profile.',
        response: '{ "user": { "id", "username", "email", "avatar", "bio", "xp", "level", "coins", ... } }',
      },
      {
        method: 'PUT', path: '/api/users/me',
        description: 'Update the authenticated user\'s profile fields.',
        body: [
          { name: 'username', type: 'string', required: false, desc: 'New username (3-32 chars)' },
          { name: 'email', type: 'string', required: false, desc: 'New email address' },
          { name: 'bio', type: 'string', required: false, desc: 'User bio text' },
          { name: 'avatar', type: 'string', required: false, desc: 'Avatar URL' },
          { name: 'status', type: 'string', required: false, desc: 'Status message' },
          { name: 'isPublic', type: 'boolean', required: false, desc: 'Profile visibility' },
          { name: 'coins', type: 'number', required: false, desc: 'Coin balance' },
          { name: 'alpacas', type: 'json', required: false, desc: 'Alpaca data array' },
          { name: 'items', type: 'json', required: false, desc: 'Items data array' },
          { name: 'upgrades', type: 'number', required: false, desc: 'Upgrade count' },
        ],
        response: '{ "user": { ... } }',
      },
      {
        method: 'DELETE', path: '/api/users/me',
        description: 'Permanently delete the authenticated user\'s account and all data.',
        response: '{ "message": "Account deleted" }',
      },
      {
        method: 'PUT', path: '/api/users/me/password',
        description: 'Change the authenticated user\'s password.',
        body: [
          { name: 'currentPassword', type: 'string', required: true, desc: 'Current password' },
          { name: 'newPassword', type: 'string', required: true, desc: 'New password (same policy as registration)' },
        ],
        response: '{ "message": "Password updated" }',
      },
      {
        method: 'GET', path: '/api/users/me/export',
        description: 'Export all user data in the specified format (GDPR compliance).',
        params: [
          { name: 'format', in: 'query', type: 'string', required: false, desc: 'json | csv | xml (default: json)' },
        ],
        response: 'File download with user data (profile, posts, friends, games, messages)',
      },
      {
        method: 'POST', path: '/api/users/me/delete-request',
        description: 'Submit a formal data deletion request for admin processing.',
        response: '{ "request": { "id", "type": "delete", "status": "pending" } }',
      },
      {
        method: 'GET', path: '/api/users/me/data-requests',
        description: 'List all data requests submitted by the authenticated user.',
        response: '{ "requests": [ ... ] }',
      },
      {
        method: 'POST', path: '/api/users/me/generate-avatar',
        description: 'Generate an AI-powered avatar using Hugging Face.',
        body: [
          { name: 'prompt', type: 'string', required: false, desc: 'Image generation prompt' },
        ],
        response: '{ "avatar": "data:image/png;base64,..." }',
      },
      {
        method: 'POST', path: '/api/users/me/generate-image',
        description: 'Generate an AI image for posts or profile.',
        body: [
          { name: 'prompt', type: 'string', required: true, desc: 'Image generation prompt' },
        ],
        response: '{ "image": "data:image/png;base64,..." }',
      },
      {
        method: 'GET', path: '/api/users',
        description: 'List all users with search and pagination.',
        params: [
          { name: 'search', in: 'query', type: 'string', required: false, desc: 'Search by username or bio' },
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max results (default: 50)' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip results (default: 0)' },
        ],
        response: '{ "users": [ ... ] }',
      },
      {
        method: 'GET', path: '/api/users/:id',
        description: 'Get a specific user\'s public profile.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'User ID' },
        ],
        response: '{ "user": { ... } }',
      },
    ],
  },
  {
    id: 'friends',
    label: 'Friends',
    description: 'Friend management: requests, blocking, and online status.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'GET', path: '/api/friends',
        description: 'List all friends of the authenticated user.',
        response: '{ "friends": [ { "id", "username", "avatar", "is_online", ... } ] }',
      },
      {
        method: 'GET', path: '/api/friends/online',
        description: 'List only online friends.',
        response: '{ "friends": [ ... ] }',
      },
      {
        method: 'GET', path: '/api/friends/requests',
        description: 'List pending friend requests (sent and received).',
        response: '{ "received": [ ... ], "sent": [ ... ] }',
      },
      {
        method: 'POST', path: '/api/friends/requests',
        description: 'Send a friend request to another user.',
        body: [
          { name: 'receiverId', type: 'number', required: true, desc: 'Target user ID' },
        ],
        response: '{ "request": { "id", "sender_id", "receiver_id", "status": "pending" } }',
      },
      {
        method: 'PUT', path: '/api/friends/requests/:id/accept',
        description: 'Accept a pending friend request.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'Friend request ID' },
        ],
        response: '{ "message": "Friend request accepted" }',
      },
      {
        method: 'PUT', path: '/api/friends/requests/:id/decline',
        description: 'Decline a pending friend request.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'Friend request ID' },
        ],
        response: '{ "message": "Friend request declined" }',
      },
      {
        method: 'DELETE', path: '/api/friends/:id',
        description: 'Remove a friend.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'Friend user ID' },
        ],
        response: '{ "message": "Friend removed" }',
      },
      {
        method: 'POST', path: '/api/friends/block',
        description: 'Block a user (also removes from friends if applicable).',
        body: [
          { name: 'blockedUserId', type: 'number', required: true, desc: 'User ID to block' },
        ],
        response: '{ "message": "User blocked" }',
      },
      {
        method: 'DELETE', path: '/api/friends/block/:id',
        description: 'Unblock a previously blocked user.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'Blocked user ID' },
        ],
        response: '{ "message": "User unblocked" }',
      },
      {
        method: 'GET', path: '/api/friends/blocked',
        description: 'List all blocked users.',
        response: '{ "blocked": [ ... ] }',
      },
    ],
  },
  {
    id: 'chat',
    label: 'Chat',
    description: 'Direct messages and group chat rooms. Real-time delivery via Socket.IO.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'GET', path: '/api/chat/conversations',
        description: 'List all DM conversations with last message preview.',
        response: '{ "conversations": [ { "user": { ... }, "lastMessage": { ... }, "unreadCount": 0 } ] }',
      },
      {
        method: 'GET', path: '/api/chat/unread',
        description: 'Get total unread message count.',
        response: '{ "unread": 5 }',
      },
      {
        method: 'GET', path: '/api/chat/dm/:userId',
        description: 'Get message history with a specific user.',
        params: [
          { name: 'userId', in: 'path', type: 'number', required: true, desc: 'Other user\'s ID' },
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max messages (default: 50)' },
          { name: 'before', in: 'query', type: 'number', required: false, desc: 'Load messages before this ID' },
        ],
        response: '{ "messages": [ { "id", "sender_id", "content", "created_at", "is_read" } ] }',
      },
      {
        method: 'GET', path: '/api/chat/rooms',
        description: 'List all group chat rooms the user belongs to.',
        response: '{ "rooms": [ { "id", "name", "owner_id", "memberCount", ... } ] }',
      },
      {
        method: 'POST', path: '/api/chat/rooms',
        description: 'Create a new group chat room.',
        body: [
          { name: 'name', type: 'string', required: true, desc: 'Room name' },
          { name: 'memberIds', type: 'number[]', required: false, desc: 'Initial member IDs to invite' },
        ],
        response: '{ "room": { "id", "name", "owner_id", ... } }',
      },
      {
        method: 'GET', path: '/api/chat/rooms/:id/messages',
        description: 'Get messages in a group chat room.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'Room ID' },
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max messages' },
        ],
        response: '{ "messages": [ ... ] }',
      },
      {
        method: 'POST', path: '/api/chat/rooms/:id/members',
        description: 'Add a member to a group chat room.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Room ID' }],
        body: [{ name: 'userId', type: 'number', required: true, desc: 'User ID to add' }],
        response: '{ "message": "Member added" }',
      },
      {
        method: 'DELETE', path: '/api/chat/rooms/:id/members/:userId',
        description: 'Remove a member from a group chat room.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'Room ID' },
          { name: 'userId', in: 'path', type: 'number', required: true, desc: 'User ID to remove' },
        ],
        response: '{ "message": "Member removed" }',
      },
      {
        method: 'DELETE', path: '/api/chat/rooms/:id',
        description: 'Delete a group chat room (owner only).',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Room ID' }],
        response: '{ "message": "Room deleted" }',
      },
    ],
  },
  {
    id: 'posts',
    label: 'Posts / Feed',
    description: 'Social feed with posts, likes, and image attachments.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'GET', path: '/api/posts',
        description: 'Get the social feed (public posts + friends\' posts). Supports optional auth.',
        params: [
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max posts (default: 20)' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip posts' },
        ],
        response: '{ "posts": [ { "id", "author", "content", "image_url", "likes_count", "created_at" } ] }',
      },
      {
        method: 'GET', path: '/api/posts/user/:userId',
        description: 'Get all posts by a specific user.',
        params: [{ name: 'userId', in: 'path', type: 'number', required: true, desc: 'Author user ID' }],
        response: '{ "posts": [ ... ] }',
      },
      {
        method: 'GET', path: '/api/posts/:id',
        description: 'Get a single post by ID.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Post ID' }],
        response: '{ "post": { ... } }',
      },
      {
        method: 'POST', path: '/api/posts',
        description: 'Create a new post. Requires JWT.',
        body: [
          { name: 'content', type: 'string', required: true, desc: 'Post text content' },
          { name: 'imageUrl', type: 'string', required: false, desc: 'Attached image URL' },
          { name: 'isPublic', type: 'boolean', required: false, desc: 'Post visibility (default: true)' },
        ],
        response: '{ "post": { ... } }',
      },
      {
        method: 'PUT', path: '/api/posts/:id',
        description: 'Update own post. Requires JWT.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Post ID' }],
        body: [
          { name: 'content', type: 'string', required: false, desc: 'Updated text' },
          { name: 'imageUrl', type: 'string', required: false, desc: 'Updated image URL' },
        ],
        response: '{ "post": { ... } }',
      },
      {
        method: 'DELETE', path: '/api/posts/:id',
        description: 'Delete own post. Requires JWT.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Post ID' }],
        response: '{ "message": "Post deleted" }',
      },
      {
        method: 'POST', path: '/api/posts/:id/like',
        description: 'Like a post. Requires JWT.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Post ID' }],
        response: '{ "message": "Post liked", "likes_count": 5 }',
      },
      {
        method: 'DELETE', path: '/api/posts/:id/like',
        description: 'Unlike a post. Requires JWT.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Post ID' }],
        response: '{ "message": "Post unliked", "likes_count": 4 }',
      },
    ],
  },
  {
    id: 'game',
    label: 'Game',
    description: 'Game statistics, leaderboard, farm persistence, achievements, and daily challenges.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'GET', path: '/api/game/stats',
        description: 'Get the authenticated user\'s game statistics.',
        params: [{ name: 'gameType', in: 'query', type: 'string', required: false, desc: 'Game type filter (default: spit_royale)' }],
        response: '{ "stats": { "wins", "losses", "draws", "elo" } }',
      },
      {
        method: 'GET', path: '/api/game/history',
        description: 'Get the authenticated user\'s match history.',
        params: [
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max matches (default: 20)' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip matches' },
        ],
        response: '{ "games": [ { "id", "player1_id", "player2_id", "winner_id", "scores", ... } ] }',
      },
      {
        method: 'GET', path: '/api/game/leaderboard',
        description: 'Get the game leaderboard sorted by ELO rating.',
        params: [
          { name: 'gameType', in: 'query', type: 'string', required: false, desc: 'Game type (default: spit_royale)' },
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max entries (default: 20)' },
        ],
        response: '{ "leaderboard": [ { "user_id", "username", "elo", "wins", "losses" } ] }',
      },
      {
        method: 'GET', path: '/api/game/farm',
        description: 'Load the authenticated user\'s saved alpaca farm state.',
        response: '{ "farm": { "alpacas": [...], "resources": {...}, "level": 1 } }',
      },
      {
        method: 'PUT', path: '/api/game/farm',
        description: 'Save the authenticated user\'s alpaca farm state.',
        body: [{ name: 'farmData', type: 'object', required: true, desc: 'Complete farm state (JSON)' }],
        response: '{ "farm": { ... } }',
      },
      {
        method: 'GET', path: '/api/game/achievements',
        description: 'List all achievements with user unlock status.',
        response: '{ "achievements": [ { "key", "name", "description", "xp_reward", "unlocked": true/false } ] }',
      },
      {
        method: 'GET', path: '/api/game/challenges',
        description: 'Get today\'s daily challenges with completion status.',
        response: '{ "challenges": [ { "id", "title", "description", "xp_reward", "completed": true/false } ] }',
      },
    ],
  },
  {
    id: 'organizations',
    label: 'Organizations',
    description: 'Team and group management with role-based membership.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'GET', path: '/api/organizations',
        description: 'List all public organizations with search.',
        params: [
          { name: 'search', in: 'query', type: 'string', required: false, desc: 'Search by name' },
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max results' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip results' },
        ],
        response: '{ "organizations": [ ... ] }',
      },
      {
        method: 'GET', path: '/api/organizations/mine',
        description: 'List organizations the authenticated user belongs to.',
        response: '{ "organizations": [ ... ] }',
      },
      {
        method: 'GET', path: '/api/organizations/:id',
        description: 'Get organization details with member list.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Organization ID' }],
        response: '{ "organization": { "id", "name", "description", "members": [...] } }',
      },
      {
        method: 'POST', path: '/api/organizations',
        description: 'Create a new organization.',
        body: [
          { name: 'name', type: 'string', required: true, desc: 'Organization name (unique)' },
          { name: 'description', type: 'string', required: false, desc: 'Organization description' },
        ],
        response: '{ "organization": { ... } }',
      },
      {
        method: 'PUT', path: '/api/organizations/:id',
        description: 'Update organization details (owner/admin only).',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Organization ID' }],
        body: [
          { name: 'name', type: 'string', required: false, desc: 'New name' },
          { name: 'description', type: 'string', required: false, desc: 'New description' },
        ],
        response: '{ "organization": { ... } }',
      },
      {
        method: 'DELETE', path: '/api/organizations/:id',
        description: 'Delete an organization (owner only).',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Organization ID' }],
        response: '{ "message": "Organization deleted" }',
      },
      {
        method: 'POST', path: '/api/organizations/:id/members',
        description: 'Add a member to the organization.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Organization ID' }],
        body: [
          { name: 'userId', type: 'number', required: true, desc: 'User ID to add' },
          { name: 'role', type: 'string', required: false, desc: 'Role: owner | admin | member' },
        ],
        response: '{ "message": "Member added" }',
      },
      {
        method: 'DELETE', path: '/api/organizations/:id/members/:userId',
        description: 'Remove a member from the organization.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'Organization ID' },
          { name: 'userId', in: 'path', type: 'number', required: true, desc: 'User ID to remove' },
        ],
        response: '{ "message": "Member removed" }',
      },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Real-time notification management. Delivered via Socket.IO.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'GET', path: '/api/notifications',
        description: 'List all notifications for the authenticated user.',
        params: [
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max notifications' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip notifications' },
        ],
        response: '{ "notifications": [ { "id", "type", "title", "message", "is_read", "created_at" } ] }',
      },
      {
        method: 'PUT', path: '/api/notifications/read-all',
        description: 'Mark all notifications as read.',
        response: '{ "message": "All notifications marked as read" }',
      },
      {
        method: 'PUT', path: '/api/notifications/:id/read',
        description: 'Mark a single notification as read.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Notification ID' }],
        response: '{ "message": "Notification marked as read" }',
      },
      {
        method: 'DELETE', path: '/api/notifications/:id',
        description: 'Delete a notification.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Notification ID' }],
        response: '{ "message": "Notification deleted" }',
      },
    ],
  },
  {
    id: 'uploads',
    label: 'File Uploads',
    description: 'File upload and management system. Max 10 files per request, 10 MB each.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'POST', path: '/api/uploads',
        description: 'Upload files (multipart/form-data). Field name: "files".',
        body: [
          { name: 'files', type: 'File[]', required: true, desc: 'Up to 10 files, max 10 MB each (images, documents)' },
        ],
        response: '{ "files": [ { "id", "original_name", "mime_type", "size_bytes", "url" } ] }',
      },
      {
        method: 'GET', path: '/api/uploads',
        description: 'List all files uploaded by the authenticated user.',
        response: '{ "files": [ ... ] }',
      },
      {
        method: 'DELETE', path: '/api/uploads/:id',
        description: 'Delete an uploaded file.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'File ID' }],
        response: '{ "message": "File deleted" }',
      },
    ],
  },
  {
    id: 'help',
    label: 'AI Help Desk',
    description: 'AI-powered help chat using Groq (Llama 3.3-70B). Supports streaming responses.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'POST', path: '/api/help/chat',
        description: 'Send a message to the AI help desk and receive a complete response.',
        body: [
          { name: 'messages', type: 'array', required: true, desc: 'Conversation history: [{ role: "user"|"assistant", content: "..." }]' },
        ],
        response: '{ "reply": "..." }',
      },
      {
        method: 'POST', path: '/api/help/chat/stream',
        description: 'Send a message and receive a streaming response via Server-Sent Events (SSE).',
        body: [
          { name: 'messages', type: 'array', required: true, desc: 'Conversation history' },
        ],
        response: 'SSE stream: data: {"token": "..."} per chunk, data: [DONE] when complete',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Administrative endpoints for site management and GDPR processing.',
    auth: 'admin',
    rateLimit: '60 req/min',
    endpoints: [
      {
        method: 'GET', path: '/api/admin/stats',
        description: 'Get site-wide statistics (user count, games, posts, etc.).',
        response: '{ "stats": { "totalUsers", "onlineUsers", "totalGames", "totalPosts", "totalOrgs" } }',
      },
      {
        method: 'GET', path: '/api/admin/users',
        description: 'List all users with pagination.',
        params: [
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max users (default: 50)' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip users' },
          { name: 'search', in: 'query', type: 'string', required: false, desc: 'Search by username' },
        ],
        response: '{ "users": [ ... ], "total": 100 }',
      },
      {
        method: 'DELETE', path: '/api/admin/users/:id',
        description: 'Force-delete a user account.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'User ID' }],
        response: '{ "message": "User deleted" }',
      },
      {
        method: 'PUT', path: '/api/admin/users/:id/toggle-admin',
        description: 'Grant or revoke admin privileges for a user.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'User ID' }],
        response: '{ "user": { "id", "is_admin": true/false } }',
      },
      {
        method: 'GET', path: '/api/admin/data-requests',
        description: 'List all pending GDPR data requests.',
        response: '{ "requests": [ { "id", "user_id", "type", "status", "created_at" } ] }',
      },
      {
        method: 'POST', path: '/api/admin/data-requests/:id/process',
        description: 'Process a GDPR data request (export or delete user data).',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Data request ID' }],
        response: '{ "message": "Request processed", "request": { ... } }',
      },
    ],
  },
  {
    id: 'public',
    label: 'Public API',
    description: 'External API endpoints. Requires X-API-Key header. Supports data anonymization.',
    auth: 'apikey',
    rateLimit: '30 req/min',
    endpoints: [
      {
        method: 'GET', path: '/api/public',
        description: 'API documentation and endpoint listing.',
        response: '{ "name": "AlpacaParty Public API", "version": "1.0", "endpoints": [...] }',
      },
      {
        method: 'GET', path: '/api/public/users',
        description: 'List public user profiles.',
        params: [
          { name: 'search', in: 'query', type: 'string', required: false, desc: 'Search by username' },
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max results (default: 20)' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip results' },
          { name: 'anonymized', in: 'query', type: 'boolean', required: false, desc: 'Hash usernames, hide emails' },
        ],
        response: '{ "users": [ ... ] }',
      },
      {
        method: 'GET', path: '/api/public/users/:id',
        description: 'Get a specific user\'s public profile.',
        params: [
          { name: 'id', in: 'path', type: 'number', required: true, desc: 'User ID' },
          { name: 'anonymized', in: 'query', type: 'boolean', required: false, desc: 'Anonymize data' },
        ],
        response: '{ "user": { ... } }',
      },
      {
        method: 'GET', path: '/api/public/leaderboard',
        description: 'Get game leaderboard.',
        params: [
          { name: 'gameType', in: 'query', type: 'string', required: false, desc: 'Game type (default: spit_royale)' },
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max entries (default: 20)' },
          { name: 'anonymized', in: 'query', type: 'boolean', required: false, desc: 'Anonymize data' },
        ],
        response: '{ "leaderboard": [ ... ] }',
      },
      {
        method: 'GET', path: '/api/public/posts',
        description: 'Get public posts.',
        params: [
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max posts (default: 20)' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip posts' },
          { name: 'anonymized', in: 'query', type: 'boolean', required: false, desc: 'Anonymize data' },
        ],
        response: '{ "posts": [ ... ] }',
      },
      {
        method: 'POST', path: '/api/public/posts',
        description: 'Create a post via service-level API.',
        body: [
          { name: 'authorId', type: 'number', required: true, desc: 'Author user ID' },
          { name: 'content', type: 'string', required: true, desc: 'Post content' },
          { name: 'imageUrl', type: 'string', required: false, desc: 'Image URL' },
        ],
        response: '{ "post": { ... } }',
      },
      {
        method: 'PUT', path: '/api/public/posts/:id',
        description: 'Update a post via service-level API.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Post ID' }],
        body: [
          { name: 'content', type: 'string', required: false, desc: 'Updated content' },
          { name: 'imageUrl', type: 'string', required: false, desc: 'Updated image' },
        ],
        response: '{ "post": { ... } }',
      },
      {
        method: 'DELETE', path: '/api/public/posts/:id',
        description: 'Delete a post via service-level API.',
        params: [{ name: 'id', in: 'path', type: 'number', required: true, desc: 'Post ID' }],
        response: '{ "message": "Post deleted" }',
      },
      {
        method: 'GET', path: '/api/public/organizations',
        description: 'List public organizations.',
        params: [
          { name: 'search', in: 'query', type: 'string', required: false, desc: 'Search by name' },
          { name: 'limit', in: 'query', type: 'number', required: false, desc: 'Max results (default: 20)' },
          { name: 'offset', in: 'query', type: 'number', required: false, desc: 'Skip results' },
        ],
        response: '{ "organizations": [ ... ] }',
      },
      {
        method: 'GET', path: '/api/public/mock',
        description: 'Get an anonymized mock dataset for testing.',
        response: '{ "users": [...], "posts": [...] }',
      },
    ],
  },
  {
    id: 'websocket',
    label: 'WebSocket Events',
    description: 'Real-time events via Socket.IO. Connect with JWT token for authentication.',
    auth: 'jwt',
    endpoints: [
      {
        method: 'EVENT', path: 'dm:send',
        description: 'Send a direct message. Payload: { receiverId, content }',
        response: 'Server emits dm:message to both sender and receiver rooms.',
      },
      {
        method: 'EVENT', path: 'dm:message',
        description: 'Receive a direct message. Payload: { id, sender_id, content, created_at }',
      },
      {
        method: 'EVENT', path: 'room:join',
        description: 'Join a group chat room. Payload: { roomId }',
      },
      {
        method: 'EVENT', path: 'room:message',
        description: 'Send/receive a group chat message. Payload: { roomId, content }',
      },
      {
        method: 'EVENT', path: 'presence',
        description: 'User online/offline status update. Payload: { userId, isOnline }',
      },
      {
        method: 'EVENT', path: 'notification',
        description: 'Receive a real-time notification. Payload: { id, type, title, message }',
      },
      {
        method: 'EVENT', path: 'game:create',
        description: 'Create a new game session. Payload: { gameType }',
      },
      {
        method: 'EVENT', path: 'game:join',
        description: 'Join an existing game session. Payload: { gameId }',
      },
      {
        method: 'EVENT', path: 'game:finish',
        description: 'Game completed. Server updates ELO and awards XP. Payload: { gameId, winnerId, scores }',
      },
    ],
  },
]
</script>

<style scoped>
.docs-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

h1 {
  font-size: 2rem;
  color: var(--primary, #00f0ff);
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #a0a0b0;
  margin-bottom: 1.5rem;
}

/* ── Nav pills ──────────────────────────────────────────── */
.docs-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.nav-pill {
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 20px;
  background: transparent;
  color: #a0a0b0;
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.15s;
  text-decoration: none;
}
.nav-pill:hover {
  color: #e0e0f0;
  border-color: #555;
  background: rgba(0, 240, 255, 0.1);
}

/* ── Section ────────────────────────────────────────────── */
.endpoint-section h2 {
  font-size: 1.4rem;
  margin-bottom: 0.3rem;
  color: var(--primary, #00f0ff);
}

.section-desc {
  color: #a0a0b0;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.auth-badge {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-auth { background: #1a3a2a; color: #4caf50; border: 1px solid #4caf50; }
.badge-admin { background: #3a1a1a; color: #ff6b6b; border: 1px solid #ff6b6b; }
.badge-apikey { background: #3a3a1a; color: #ffd93d; border: 1px solid #ffd93d; }
.badge-rate { background: #1a2a3a; color: #64b5f6; border: 1px solid #64b5f6; }

/* ── Endpoint card ──────────────────────────────────────── */
.endpoint-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
}

.endpoint-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.method-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: monospace;
  letter-spacing: 0.03em;
  min-width: 52px;
  text-align: center;
}
.method-get    { background: #1a3a2a; color: #4caf50; }
.method-post   { background: #1a2a3a; color: #64b5f6; }
.method-put    { background: #3a3a1a; color: #ffa726; }
.method-delete { background: #3a1a1a; color: #ef5350; }
.method-event  { background: #2a1a3a; color: #ce93d8; }

.endpoint-path {
  font-size: 0.9rem;
  color: #e0e0f0;
}

.endpoint-desc {
  font-size: 0.85rem;
  color: #a0a0b0;
  margin: 0;
  line-height: 1.5;
}

/* ── Detail tables ──────────────────────────────────────── */
.endpoint-detail {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, #2a2a3a);
}

.endpoint-detail h4 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #808090;
  margin-bottom: 0.5rem;
}

.param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.param-table th {
  text-align: left;
  padding: 0.35rem 0.5rem;
  color: var(--primary, #00f0ff);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.param-table td {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid rgba(42, 42, 58, 0.4);
  color: #c0c0d0;
}

.response-block {
  background: #0a0a12;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  padding: 0.6rem 0.9rem;
  font-size: 0.8rem;
  color: #a0ffa0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

code {
  background: rgba(0, 240, 255, 0.1);
  border-radius: 4px;
  padding: 0.1em 0.35em;
  font-size: 0.9em;
}
</style>
