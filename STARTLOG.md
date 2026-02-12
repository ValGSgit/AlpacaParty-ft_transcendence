# 📋 Transcendence — Development Backlog

**Tech Stack:** Vue 3 + Express.js + PostgreSQL + Docker + nginx + Socket.io + Three.js  
**Target:** Minimum 60 points from 42 Subject modules  
**Status:** Development roadmap for fresh repository

---

## 📊 Points Summary by Category

| Category | Available Points | Modules |
|----------|------------------|---------|
| **1. Web** | 31 pts | Framework (7), WebSockets (7), User Interaction (7), Public API (7), ORM (1), Notifications (1), Design System (1) |
| **2. Accessibility** | 1 pt | Multi-browser support (1) |
| **3. User Management** | 17 pts | Standard Auth (7), Organizations (7), OAuth (1), Game Stats (1), Analytics (1) |
| **6. Gaming** | 37 pts | Base Game (7), Remote Players (7), 3+ Players (7), Second Game (7), 3D Graphics (7), Customization (1), Gamification (1) |
| **8. Data & Analytics** | 2 pts | Export/Import (1), GDPR (1) |
| **TOTAL AVAILABLE** | **88 pts** | **Minimum needed: 60** |

---

## 🎯 Recommended Development Phases

### Phase 1: Foundation (21 pts) — Core Infrastructure
**Goal:** Set up base architecture and essential features
**Duration:** 2-3 weeks

#### ✅ Module 1.1: Web Framework (7 pts) — Major
**Description:** Use a framework for both frontend and backend

**Implementation:**
- ✅ Tech chosen: Vue 3 (frontend) + Express.js (backend)
- ✅ Docker + nginx reverse proxy architecture
- ✅ PostgreSQL database

**Tasks:**
- [ ] Initialize Vue 3 project with Vite
- [ ] Set up Express.js backend structure
- [ ] Configure PostgreSQL with connection pooling
- [ ] Create Docker Compose (nginx, frontend, backend, postgres)
- [ ] Configure nginx reverse proxy (port 8080)
- [ ] Set up development workflow (make commands)
- [ ] Implement environment variable management (.env)

**Acceptance Criteria:**
- ✅ Frontend accessible through nginx at http://localhost:8080
- ✅ Backend API accessible at http://localhost:8080/api
- ✅ Database migrations system in place
- ✅ Hot reload working for frontend and backend
- ✅ Docker services can start/stop cleanly

**Files to create:**
- `docker-compose.yml`
- `nginx/nginx.conf`
- `frontend/` (Vue 3 app)
- `backend/` (Express app)
- `Makefile`

---

#### ✅ Module 3.1: Standard User Management (7 pts) — Major
**Description:** Standard user authentication and profile system

**Tasks:**
- [ ] **Authentication**
  - [ ] User registration (username, email, password)
  - [ ] Password hashing with bcrypt
  - [ ] JWT token generation and validation
  - [ ] Login endpoint
  - [ ] Logout endpoint
  - [ ] Token refresh mechanism
  - [ ] Password reset flow
- [ ] **Profile System**
  - [ ] View user profiles
  - [ ] Update profile information (bio, display name)
  - [ ] Avatar upload with default avatar
  - [ ] Profile page UI
- [ ] **Friends System**
  - [ ] Send friend requests
  - [ ] Accept/reject friend requests
  - [ ] Remove friends
  - [ ] View friends list
  - [ ] Online/offline status tracking
  - [ ] Friend request notifications

**Database Tables:**
```sql
users (id, username, email, password_hash, avatar, bio, is_admin, created_at)
friend_requests (id, sender_id, receiver_id, status, created_at)
friends (id, user_id, friend_id, created_at)
blocked_users (id, user_id, blocked_user_id, created_at)
password_reset_tokens (id, user_id, token, expires_at)
```

**API Endpoints:**
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login and get JWT
- `POST /api/auth/logout` — Invalidate token
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/reset-password` — Request password reset
- `GET /api/users/:id` — Get user profile
- `PUT /api/users/:id` — Update profile
- `POST /api/users/:id/avatar` — Upload avatar
- `POST /api/friends/request` — Send friend request
- `PUT /api/friends/request/:id` — Accept/reject request
- `DELETE /api/friends/:id` — Remove friend
- `GET /api/friends` — List friends

**Acceptance Criteria:**
- ✅ Users can register with email/password
- ✅ Passwords are hashed (never stored plain-text)
- ✅ Users can login and receive JWT
- ✅ Profile pages display user information
- ✅ Users can upload avatars (default if none)
- ✅ Users can update their bio and info
- ✅ Friend requests can be sent/accepted/rejected
- ✅ Friends list shows online/offline status
- ✅ Password reset works via email (or token)

---

#### ✅ Module 1.2: Real-time WebSockets (7 pts) — Major
**Description:** Implement real-time features using WebSockets

**Implementation:**
- ✅ Tech chosen: Socket.io

**Tasks:**
- [ ] **Socket.io Setup**
  - [ ] Install and configure Socket.io server
  - [ ] Install Socket.io client
  - [ ] JWT authentication for WebSocket connections
  - [ ] Connection/disconnection event handlers
- [ ] **Real-time Chat System**
  - [ ] Private 1-on-1 messaging
  - [ ] Group chat rooms
  - [ ] Message history persistence
  - [ ] Typing indicators
  - [ ] Read receipts
  - [ ] Message delivery confirmations
- [ ] **Status Updates**
  - [ ] Online/offline status broadcasting
  - [ ] Friend status notifications
- [ ] **Connection Management**
  - [ ] Graceful disconnection handling
  - [ ] Reconnection logic
  - [ ] Message queue for offline users

**Database Tables:**
```sql
chat_rooms (id, name, type, created_at)
chat_room_members (room_id, user_id, joined_at, last_read_at)
messages (id, room_id, sender_id, content, created_at, edited_at)
```

**Socket Events:**
- `connection` — Client connected
- `disconnect` — Client disconnected
- `authenticate` — Authenticate with JWT
- `message:send` — Send message
- `message:receive` — Receive message
- `message:read` — Mark message as read
- `typing:start` — User started typing
- `typing:stop` — User stopped typing
- `status:online` — User came online
- `status:offline` — User went offline

**API Endpoints:**
- `GET /api/chat/rooms` — List user's chat rooms
- `POST /api/chat/rooms` — Create chat room
- `GET /api/chat/rooms/:id/messages` — Get message history
- `POST /api/chat/rooms/:id/messages` — Send message (REST fallback)

**Acceptance Criteria:**
- ✅ Real-time messages delivered instantly
- ✅ Multiple clients stay synchronized
- ✅ Connection/disconnection handled gracefully
- ✅ Offline messages stored and delivered on reconnection
- ✅ Typing indicators work
- ✅ Online status updates in real-time
- ✅ No memory leaks on disconnect

---

### Phase 2: User Interaction & Notifications (9 pts)
**Goal:** Complete the social platform features
**Duration:** 1-2 weeks

#### ✅ Module 1.3: User Interaction (INCLUDED in Phase 1)
**Description:** Basic chat, profile, and friends system

**Status:** ✅ Covered by Modules 3.1 (Standard User Management) and 1.2 (WebSockets)

This module requires:
- ✅ Basic chat system — **Implemented in Module 1.2**
- ✅ Profile system — **Implemented in Module 3.1**
- ✅ Friends system — **Implemented in Module 3.1**

**No additional work needed** — requirements already met by previous modules.

---

#### ✅ Module 1.4: Notification System (1 pt) — Minor
**Description:** Complete notification system for all CRUD actions

**Tasks:**
- [ ] Create notifications infrastructure
- [ ] Implement notification triggers for:
  - [ ] Friend requests sent/received
  - [ ] Friend request accepted/rejected
  - [ ] New messages (if chat room not open)
  - [ ] Game invitations
  - [ ] Game results
  - [ ] Organization invites
  - [ ] System announcements
- [ ] Real-time notification delivery via WebSocket
- [ ] Notification badge counts
- [ ] Mark notifications as read
- [ ] Delete notifications
- [ ] Notification preferences

**Database Tables:**
```sql
notifications (id, user_id, type, title, message, link, read, created_at)
```

**Socket Events:**
- `notification:new` — New notification

**API Endpoints:**
- `GET /api/notifications` — List notifications
- `GET /api/notifications/unread-count` — Count unread
- `PUT /api/notifications/:id/read` — Mark as read
- `PUT /api/notifications/read-all` — Mark all as read
- `DELETE /api/notifications/:id` — Delete notification

**Acceptance Criteria:**
- ✅ Notifications appear instantly via WebSocket
- ✅ Badge shows unread count
- ✅ All major actions trigger notifications
- ✅ Users can mark as read and delete
- ✅ Clicking notification navigates to relevant page

---

#### ✅ Module 3.2: OAuth 2.0 Authentication (1 pt) — Minor
**Description:** Remote authentication with OAuth 2.0

**Tasks:**
- [ ] **Google OAuth**
  - [ ] Set up Google Cloud Console project
  - [ ] Configure OAuth consent screen
  - [ ] Install Passport.js with Google strategy
  - [ ] Implement `/api/auth/google` endpoint
  - [ ] Implement callback handler
  - [ ] Link Google account to user
- [ ] **GitHub OAuth**
  - [ ] Create GitHub OAuth App
  - [ ] Install Passport.js with GitHub strategy
  - [ ] Implement `/api/auth/github` endpoint
  - [ ] Implement callback handler
  - [ ] Link GitHub account to user
- [ ] Handle OAuth user creation/login
- [ ] Generate JWT for OAuth users

**Database Updates:**
```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN github_id VARCHAR(255);
```

**Environment Variables:**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:8080/api/auth/github/callback
```

**API Endpoints:**
- `GET /api/auth/google` — Initiate Google OAuth
- `GET /api/auth/google/callback` — Google callback
- `GET /api/auth/github` — Initiate GitHub OAuth
- `GET /api/auth/github/callback` — GitHub callback

**Acceptance Criteria:**
- ✅ Users can login with Google
- ✅ Users can login with GitHub
- ✅ OAuth accounts linked to existing users (if email matches)
- ✅ New users created from OAuth
- ✅ JWT tokens issued after OAuth

---

#### ✅ Module: Two-Factor Authentication (BONUS) — Not in subject
**Description:** Add 2FA with TOTP for extra security

**Tasks:**
- [ ] Install speakeasy library
- [ ] Generate TOTP secrets
- [ ] Display QR codes for authenticator apps
- [ ] Verify TOTP codes on login
- [ ] Enable/disable 2FA in settings

**Database Updates:**
```sql
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
```

**API Endpoints:**
- `POST /api/auth/2fa/enable` — Enable 2FA
- `POST /api/auth/2fa/verify` — Verify TOTP code
- `POST /api/auth/2fa/disable` — Disable 2FA

**Acceptance Criteria:**
- ✅ Users can enable 2FA
- ✅ QR code generated and scanned
- ✅ Login requires TOTP code when enabled

---

### Phase 3: Gaming Core (14-21 pts)
**Goal:** Implement the main game with 3D graphics
**Duration:** 3-4 weeks

#### ✅ Module 6.1: Web-based Game (7 pts) — Major
**Description:** Complete web-based multiplayer game

**Game Concept:** Alpaca Farm (3D casual game with Three.js)

**Tasks:**
- [ ] **Game Design**
  - [ ] Define game mechanics (e.g., competitive alpaca farming)
  - [ ] Design win/loss conditions
  - [ ] Create game rules document
- [ ] **Game Rendering**
  - [ ] Set up Three.js scene
  - [ ] Create 3D models or use primitives
  - [ ] Implement camera controls
  - [ ] Add lighting and materials
- [ ] **Game Logic**
  - [ ] Implement core game loop
  - [ ] Physics or movement system
  - [ ] Scoring system
  - [ ] Win/loss detection
- [ ] **Multiplayer Foundation**
  - [ ] Game lobby system
  - [ ] Matchmaking queue
  - [ ] Game room creation
  - [ ] Player ready/unready
- [ ] **Database Integration**
  - [ ] Store game results
  - [ ] Track player statistics
  - [ ] Game history

**Database Tables:**
```sql
games (id, player1_id, player2_id, winner_id, score_p1, score_p2, duration, created_at)
user_stats (user_id, games_played, wins, losses, win_rate, created_at, updated_at)
```

**API Endpoints:**
- `POST /api/games/lobby` — Create/join lobby
- `GET /api/games/lobby/:id` — Get lobby status
- `POST /api/games/:id/start` — Start game
- `POST /api/games/:id/end` — End game and save results
- `GET /api/games/:id` — Get game details
- `GET /api/games/history/:userId` — Get user's game history

**Socket Events:**
- `lobby:join` — Join game lobby
- `lobby:leave` — Leave lobby
- `lobby:ready` — Mark player as ready
- `game:start` — Game started
- `game:update` — Game state update
- `game:end` — Game ended

**Acceptance Criteria:**
- ✅ Two players can join a game lobby
- ✅ Game renders in browser (2D or 3D)
- ✅ Game has clear rules
- ✅ Win/loss conditions work correctly
- ✅ Game results saved to database
- ✅ Players can see their game history

---

#### ✅ Module 6.5: Advanced 3D Graphics (7 pts) — Major
**Description:** Implement advanced 3D graphics using Three.js

**Tasks:**
- [ ] **3D Environment**
  - [ ] Create immersive 3D scene
  - [ ] Detailed terrain or game arena
  - [ ] Skybox or background
- [ ] **Advanced Rendering**
  - [ ] Shadows (DirectionalLight with shadowMap)
  - [ ] Realistic lighting (ambient + directional + point lights)
  - [ ] Materials (MeshStandardMaterial, PBR)
  - [ ] Textures and normal maps
- [ ] **Visual Effects**
  - [ ] Particle systems (e.g., dust, sparkles)
  - [ ] Post-processing (bloom, SSAO, color grading)
  - [ ] Animations (character movement, environment)
- [ ] **Performance Optimization**
  - [ ] LOD (Level of Detail) for models
  - [ ] Frustum culling
  - [ ] Texture compression
  - [ ] Target 60 FPS on mid-range hardware

**Libraries:**
- Three.js (core)
- three/examples/jsm/postprocessing (effects)
- three/examples/jsm/controls (camera controls)

**Acceptance Criteria:**
- ✅ 3D environment is visually impressive
- ✅ Advanced rendering techniques visible (shadows, lighting, particles)
- ✅ Smooth performance (60 FPS target)
- ✅ Interactive 3D elements
- ✅ Post-processing effects enhance visuals

---

#### ✅ Module 6.2: Remote Players (7 pts) — Major
**Description:** Enable two players on separate computers to play in real-time

**Tasks:**
- [ ] **Client-Server Architecture**
  - [ ] Server-authoritative game state
  - [ ] Client sends inputs only
  - [ ] Server validates and broadcasts state
- [ ] **Latency Handling**
  - [ ] Client-side prediction
  - [ ] Server reconciliation
  - [ ] Lag compensation techniques
  - [ ] Input buffering
- [ ] **Disconnection Handling**
  - [ ] Detect client disconnection
  - [ ] Pause game on disconnect
  - [ ] Allow reconnection within 30s timeout
  - [ ] Award win to remaining player if timeout
- [ ] **Network Optimization**
  - [ ] Delta compression for state updates
  - [ ] Prioritize critical game events
  - [ ] Reduce message frequency where possible

**Socket Events (extended):**
- `game:input` — Player input (movement, actions)
- `game:state` — Full game state update
- `game:delta` — Delta state update (optimized)
- `player:disconnect` — Player disconnected
- `player:reconnect` — Player reconnected

**Acceptance Criteria:**
- ✅ Two players on different computers can play smoothly
- ✅ Perceived latency < 100ms
- ✅ No visible desync between clients
- ✅ Disconnections handled gracefully
- ✅ Reconnection works within timeout
- ✅ Game playable even with moderate network lag

---

### Phase 4: Social Features (7-8 pts)
**Goal:** Add social depth with organizations and posts
**Duration:** 1-2 weeks

#### ✅ Module 3.3: Organization System (7 pts) — Major
**Description:** Create and manage organizations

**Tasks:**
- [ ] **Organization CRUD**
  - [ ] Create organization (name, description, logo)
  - [ ] Edit organization (owner only)
  - [ ] Delete organization (owner only)
  - [ ] List all organizations
  - [ ] View organization details
- [ ] **Member Management**
  - [ ] Add users to organization
  - [ ] Remove users from organization
  - [ ] Assign roles (owner, admin, member)
  - [ ] View organization members
- [ ] **Organization Features**
  - [ ] Organization profile page
  - [ ] Organization-specific chat rooms
  - [ ] Organization announcements/posts
  - [ ] Organization leaderboards (game stats)
- [ ] **Permissions System**
  - [ ] Owner can edit/delete org
  - [ ] Admins can add/remove members
  - [ ] Members can view and participate

**Database Tables:**
```sql
organizations (id, name, description, logo, owner_id, created_at)
organization_members (org_id, user_id, role, joined_at)
organization_posts (id, org_id, user_id, content, created_at)
```

**API Endpoints:**
- `POST /api/organizations` — Create organization
- `GET /api/organizations` — List organizations
- `GET /api/organizations/:id` — Get organization details
- `PUT /api/organizations/:id` — Update organization
- `DELETE /api/organizations/:id` — Delete organization
- `POST /api/organizations/:id/members` — Add member
- `DELETE /api/organizations/:id/members/:userId` — Remove member
- `PUT /api/organizations/:id/members/:userId` — Update role
- `GET /api/organizations/:id/members` — List members
- `POST /api/organizations/:id/posts` — Create post
- `GET /api/organizations/:id/posts` — Get posts

**Acceptance Criteria:**
- ✅ Users can create organizations
- ✅ Owners can edit and delete their organizations
- ✅ Members can be added/removed
- ✅ Role-based permissions work correctly
- ✅ Organization pages display info and members
- ✅ Organization-specific features (chat, posts) work

---

#### ✅ Module: Social Feed System (BONUS) — Not required
**Description:** Add posts/feed functionality for user engagement

**Tasks:**
- [ ] Create posts with text and images
- [ ] Like/unlike posts
- [ ] Comment on posts
- [ ] Feed algorithm (recent posts from friends)
- [ ] Post visibility (public, friends-only, organization)

**Database Tables:**
```sql
posts (id, user_id, content, image, visibility, created_at)
post_likes (post_id, user_id, created_at)
post_comments (id, post_id, user_id, content, created_at)
```

---

### Phase 5: Public API & Documentation (7 pts)
**Goal:** Create secure public API
**Duration:** 1 week

#### ✅ Module 1.5: Public API (7 pts) — Major
**Description:** Public API with authentication, rate limiting, and documentation

**Tasks:**
- [ ] **API Key System**
  - [ ] Generate API keys for users
  - [ ] Store keys securely (hashed)
  - [ ] Validate API keys on requests
  - [ ] API key management UI in settings
- [ ] **Rate Limiting**
  - [ ] Per API key (e.g., 1000 req/hour)
  - [ ] Per IP address (e.g., 100 req/hour for non-authenticated)
  - [ ] Return 429 Too Many Requests
- [ ] **API Endpoints (minimum 5)**
  - [ ] `GET /api/v1/users/:id` — Get user info
  - [ ] `POST /api/v1/users` — Create user (admin only)
  - [ ] `PUT /api/v1/users/:id` — Update user
  - [ ] `DELETE /api/v1/users/:id` — Delete user (admin only)
  - [ ] `GET /api/v1/games` — List games
  - [ ] `GET /api/v1/games/:id` — Get game details
  - [ ] `GET /api/v1/stats` — Get platform statistics
- [ ] **API Documentation**
  - [ ] Install swagger-ui-express
  - [ ] Write OpenAPI 3.0 spec
  - [ ] Document all endpoints
  - [ ] Include authentication examples
  - [ ] Serve docs at `/api/docs`

**Libraries:**
- express-rate-limit
- swagger-ui-express
- swagger-jsdoc

**Database Tables:**
```sql
api_keys (id, user_id, key_hash, name, created_at, last_used_at)
```

**Acceptance Criteria:**
- ✅ API keys required for access
- ✅ Rate limiting works (returns 429)
- ✅ At least 5 documented endpoints
- ✅ Swagger UI accessible at `/api/docs`
- ✅ Examples show how to authenticate
- ✅ Error responses documented

---

### Phase 6: Polish & Minor Modules (5-10 pts)
**Goal:** Add finishing touches and reach 60+ points
**Duration:** 2-3 weeks

#### ✅ Module 1.6: Design System (1 pt) — Minor
**Description:** Custom design system with 10+ reusable components

**Tasks:**
- [ ] **Design Tokens**
  - [ ] Color palette (primary, secondary, accent, success, warning, danger, neutrals)
  - [ ] Typography scale (h1-h6, body, caption)
  - [ ] Spacing scale (4px, 8px, 16px, 24px, 32px, 48px)
  - [ ] Border radius values
- [ ] **Icon System**
  - [ ] Choose icon library (Heroicons, Feather, Font Awesome)
  - [ ] Create icon component wrapper
  - [ ] Minimum 20 icons available
- [ ] **Reusable Components (minimum 10)**
  1. Button (variants: primary, secondary, danger, ghost, link)
  2. Input (text, email, password, textarea)
  3. Card
  4. Modal/Dialog
  5. Dropdown/Select
  6. Avatar
  7. Badge
  8. Alert/Toast
  9. Spinner/Loading
  10. Navigation
  11. Tooltip
  12. ProgressBar
- [ ] **Documentation**
  - [ ] Storybook or component showcase page
  - [ ] Usage examples for each component
  - [ ] Props documentation

**Files:**
- `frontend/src/components/ui/` (all components)
- `frontend/src/assets/styles/tokens.css` (design tokens)

**Acceptance Criteria:**
- ✅ Consistent color palette used throughout
- ✅ Typography system in place
- ✅ 10+ documented reusable components
- ✅ Components used across multiple views
- ✅ Design feels cohesive

---

#### ✅ Module 1.7: Advanced Search (1 pt) — Minor
**Description:** Search with filters, sorting, and pagination

**Tasks:**
- [ ] **Search Implementation**
  - [ ] Full-text search for users (username, bio)
  - [ ] Search for posts (content, tags)
  - [ ] Search for games (by player names)
  - [ ] Search for organizations (name, description)
- [ ] **Filters**
  - [ ] Date range filter
  - [ ] User status filter (online/offline)
  - [ ] Game type filter
  - [ ] Organization member count filter
- [ ] **Sorting**
  - [ ] Relevance (default)
  - [ ] Date (newest/oldest)
  - [ ] Alphabetical (A-Z, Z-A)
  - [ ] Popularity (most likes, most members, etc.)
- [ ] **Pagination**
  - [ ] Implement limit/offset pagination
  - [ ] Page size options (10, 25, 50, 100)
  - [ ] Total count and page info

**API Endpoints:**
- `GET /api/search?q={query}&type={users|posts|games|organizations}&filters={...}&sort={field}&order={asc|desc}&page={n}&limit={n}`

**Acceptance Criteria:**
- ✅ Search works across multiple entity types
- ✅ Filters narrow down results
- ✅ Sorting options work correctly
- ✅ Pagination handles large datasets
- ✅ Search UI is intuitive

---

#### ✅ Module 1.8: File Upload System (1 pt) — Minor
**Description:** File upload and management system

**Tasks:**
- [ ] **Upload Infrastructure**
  - [ ] Install multer (Express file upload middleware)
  - [ ] Configure storage (local filesystem or cloud)
  - [ ] Generate random filenames
  - [ ] Organize by upload date (e.g., /uploads/2026/02/)
- [ ] **Validation**
  - [ ] Client-side validation (file type, size)
  - [ ] Server-side validation (MIME type check)
  - [ ] File size limits (5MB for images, 10MB for documents)
  - [ ] Allowed file types (jpg, png, gif, pdf, txt, etc.)
- [ ] **Features**
  - [ ] Upload progress indicators (frontend)
  - [ ] Image preview before upload
  - [ ] File preview after upload (images, PDFs)
  - [ ] Delete uploaded files
  - [ ] Access control (owners only or public)
- [ ] **Use Cases**
  - [ ] Avatar uploads
  - [ ] Post images
  - [ ] Organization logos
  - [ ] Document sharing

**Database Tables:**
```sql
files (id, user_id, filename, original_name, mime_type, size, path, visibility, created_at)
```

**API Endpoints:**
- `POST /api/files/upload` — Upload file
- `GET /api/files/:id` — Get file metadata
- `GET /api/files/:id/download` — Download file
- `DELETE /api/files/:id` — Delete file

**Acceptance Criteria:**
- ✅ Files can be uploaded
- ✅ Client and server validation works
- ✅ File size limits enforced
- ✅ Secure storage with random filenames
- ✅ Access control prevents unauthorized access
- ✅ Preview works for images and PDFs
- ✅ Progress indicators show upload status
- ✅ Files can be deleted

---

#### ✅ Module 3.4: Game Statistics & Match History (1 pt) — Minor
**Description:** Track and display user game statistics

**Tasks:**
- [ ] **Statistics Tracking**
  - [ ] Total games played
  - [ ] Wins / losses
  - [ ] Win rate percentage
  - [ ] ELO/MMR rating system
  - [ ] Level / XP system
  - [ ] Longest win streak
  - [ ] Average game duration
- [ ] **Match History**
  - [ ] List past games with pagination
  - [ ] Show opponent information
  - [ ] Display scores
  - [ ] Show game date/time
  - [ ] Filter by game type
- [ ] **Achievements**
  - [ ] First win
  - [ ] 10 wins
  - [ ] 50 wins
  - [ ] Perfect game
  - [ ] Win streak achievements
- [ ] **Leaderboard**
  - [ ] Rank users by rating
  - [ ] Rank by total wins
  - [ ] Filter by time period (daily, weekly, all-time)
  - [ ] Show user's rank

**API Endpoints:**
- `GET /api/users/:id/stats` — Get user statistics
- `GET /api/users/:id/matches` — Get match history
- `GET /api/users/:id/achievements` — Get achievements
- `GET /api/leaderboard?sort={rating|wins}&period={daily|weekly|alltime}`

**Acceptance Criteria:**
- ✅ Statistics displayed on profile page
- ✅ Match history paginated
- ✅ Achievements unlock automatically
- ✅ Leaderboard shows top players
- ✅ Stats update after each game

---

#### ✅ Module 6.6: Game Customization (1 pt) — Minor
**Description:** Game customization options

**Tasks:**
- [ ] **Power-ups / Special Abilities (minimum 2)**
  - [ ] Speed boost
  - [ ] Shield
  - [ ] Double points
  - [ ] Freeze opponent
- [ ] **Maps / Themes (minimum 2)**
  - [ ] Default arena
  - [ ] Night mode
  - [ ] Seasonal themes
  - [ ] Custom backgrounds
- [ ] **Game Settings**
  - [ ] Difficulty level (easy, medium, hard)
  - [ ] Game duration
  - [ ] Enable/disable power-ups
  - [ ] Sound on/off
- [ ] **Persistence**
  - [ ] Save user preferences
  - [ ] Load preferences on game start
  - [ ] Default settings available

**Database Updates:**
```sql
ALTER TABLE user_stats ADD COLUMN game_settings JSONB;
```

**Acceptance Criteria:**
- ✅ At least 2 power-ups implemented
- ✅ At least 2 different maps/themes
- ✅ Settings persist per user
- ✅ Default settings work out-of-box
- ✅ Customizations enhance gameplay

---

#### ✅ Module 6.7: Gamification System (1 pt) — Minor
**Description:** Reward users for their actions

**Tasks:**
- [ ] **Choose 3+ from the following:**
  - [ ] **Achievements**
    - [ ] Define 10+ achievements
    - [ ] Auto-unlock based on criteria
    - [ ] Display on profile
  - [ ] **Badges**
    - [ ] Visual badges for achievements
    - [ ] Equip badges on profile
  - [ ] **Leaderboards**
    - [ ] Game-specific leaderboards
    - [ ] Global leaderboards
    - [ ] Friend leaderboards
  - [ ] **XP / Level System**
    - [ ] Earn XP from games
    - [ ] Level up at thresholds
    - [ ] Display level on profile
  - [ ] **Daily Challenges**
    - [ ] New challenges each day
    - [ ] Track challenge progress
    - [ ] Reward completion
  - [ ] **Rewards**
    - [ ] Unlock custom avatars
    - [ ] Unlock profile themes
    - [ ] Unlock titles/badges
- [ ] **Visual Feedback**
  - [ ] Achievement unlock animation
  - [ ] Level up notification
  - [ ] Progress bars
  - [ ] Badge showcase

**Database Tables:**
```sql
achievements (id, name, description, icon, criteria, points)
user_achievements (user_id, achievement_id, unlocked_at, progress)
daily_challenges (id, date, description, criteria, reward)
user_challenges (user_id, challenge_id, progress, completed)
```

**Acceptance Criteria:**
- ✅ At least 3 gamification features implemented
- ✅ System is persistent (stored in database)
- ✅ Visual feedback on unlock/level-up
- ✅ Clear progression mechanics
- ✅ Users feel rewarded for actions

---

#### ✅ Module 3.5: User Analytics Dashboard (1 pt) — Minor
**Description:** User activity analytics and insights

**Tasks:**
- [ ] **Track User Activity**
  - [ ] Login frequency (daily active users)
  - [ ] Time spent online
  - [ ] Games played per day/week
  - [ ] Messages sent per day/week
  - [ ] Posts created
  - [ ] Friends added
- [ ] **Analytics Dashboard**
  - [ ] Activity overview (last 30 days)
  - [ ] Charts (line, bar, pie)
  - [ ] Peak activity times
  - [ ] Most played game
  - [ ] Social engagement metrics
- [ ] **Privacy**
  - [ ] Users see only their own data
  - [ ] Admins can see aggregate platform data
  - [ ] No PII exposed

**Libraries:**
- Chart.js or Recharts

**API Endpoints:**
- `GET /api/users/:id/analytics` — Get user analytics
- `GET /api/admin/analytics` — Platform-wide analytics (admin only)

**Acceptance Criteria:**
- ✅ Dashboard displays user activity
- ✅ Charts visualize trends
- ✅ Privacy controls in place
- ✅ Useful insights shown

---

#### ✅ Module 8.1: Data Export/Import (1 pt) — Minor
**Description:** Export and import data in multiple formats

**Tasks:**
- [ ] **Export Functionality**
  - [ ] Export users as JSON/CSV/XML
  - [ ] Export games as JSON/CSV
  - [ ] Export posts as JSON/CSV
  - [ ] Export organizations as JSON
  - [ ] Download button in admin panel
- [ ] **Import Functionality**
  - [ ] Import users from CSV
  - [ ] Validate imported data
  - [ ] Bulk create users
  - [ ] Handle duplicates
- [ ] **Admin Feature**
  - [ ] Admin-only access
  - [ ] Audit log for exports/imports
  - [ ] Size limits for imports

**API Endpoints:**
- `GET /api/admin/export?type={users|games|posts}&format={json|csv|xml}`
- `POST /api/admin/import` (multipart/form-data)

**Acceptance Criteria:**
- ✅ Export works in 3+ formats
- ✅ Import validates data
- ✅ Bulk operations supported
- ✅ Admin-only access enforced

---

#### ✅ Module 8.2: GDPR Compliance (1 pt) — Minor
**Description:** GDPR compliance features

**Tasks:**
- [ ] **Data Request**
  - [ ] User can request all their data
  - [ ] Export as JSON
  - [ ] Include all related data (posts, messages, games, etc.)
  - [ ] Email download link or provide direct download
- [ ] **Data Deletion**
  - [ ] Request account deletion
  - [ ] Confirmation step (email or re-authentication)
  - [ ] Cascade delete or anonymize data
  - [ ] Soft delete with grace period (30 days)
- [ ] **Confirmation Emails**
  - [ ] Email sent on data request
  - [ ] Email sent on deletion request
  - [ ] Email sent on deletion completion

**API Endpoints:**
- `GET /api/users/me/data` — Download all user data
- `DELETE /api/users/me` — Request account deletion
- `POST /api/users/me/deletion-cancel` — Cancel deletion within grace period

**Acceptance Criteria:**
- ✅ Users can download their data
- ✅ Account deletion works with confirmation
- ✅ Related data properly handled
- ✅ Emails sent for all operations
- ✅ Grace period before permanent deletion

---

#### ✅ Module 2.1: Multi-Browser Support (1 pt) — Minor
**Description:** Full compatibility with 2+ additional browsers

**Tasks:**
- [ ] **Browser Testing**
  - [ ] Test on Chrome/Chromium
  - [ ] Test on Firefox
  - [ ] Test on Safari (macOS/iOS)
  - [ ] Test on Edge
- [ ] **Fix Browser-Specific Issues**
  - [ ] CSS compatibility
  - [ ] JavaScript compatibility
  - [ ] WebSocket connections
  - [ ] WebGL/Three.js rendering
  - [ ] File uploads
- [ ] **Document Limitations**
  - [ ] Note any browser-specific bugs
  - [ ] Known limitations (e.g., Safari WebGL)
- [ ] **Consistent UI/UX**
  - [ ] Same layout across browsers
  - [ ] No major visual differences

**Testing Checklist:**
- [ ] Authentication flows
- [ ] WebSocket real-time updates
- [ ] Game rendering (Canvas/WebGL)
- [ ] File uploads
- [ ] Notifications

**Acceptance Criteria:**
- ✅ Tested on 3+ browsers (Chrome, Firefox, Safari/Edge)
- ✅ No critical bugs in any browser
- ✅ UI looks consistent
- ✅ Limitations documented

---

#### ✅ Module 1.9: ORM Implementation (1 pt) — Minor
**Description:** Use an ORM for database queries

**Status:** ⚠️ **Optional** — Current SQL adapter works well

**Tasks:**
- [ ] Choose ORM (Sequelize or Prisma)
- [ ] Install and configure
- [ ] Define models
- [ ] Migrate existing queries to ORM
- [ ] Write tests
- [ ] Update documentation

**Acceptance Criteria:**
- ✅ ORM configured
- ✅ All queries use ORM
- ✅ Tests pass

---

### Phase 7: Advanced Gaming (Optional — 14+ pts)
**Goal:** Add more gaming depth
**Duration:** 2-4 weeks per major module

#### ✅ Module 6.3: Multiplayer Game (3+ players) (7 pts) — Major
**Description:** Support 3+ players simultaneously

**Tasks:**
- [ ] Design game mechanics for 3+ players
  - [ ] Tournament brackets
  - [ ] Battle royale
  - [ ] Team-based gameplay
  - [ ] Free-for-all
- [ ] Lobby system for multiple players
- [ ] Fair gameplay mechanics
- [ ] Synchronize state across all clients
- [ ] Handle player disconnections gracefully
- [ ] Spectator mode

**Database Updates:**
```sql
ALTER TABLE games ADD COLUMN players JSONB; -- Array of player IDs
ALTER TABLE games ADD COLUMN team1_score INT;
ALTER TABLE games ADD COLUMN team2_score INT;
```

**Acceptance Criteria:**
- ✅ 3+ players can play simultaneously
- ✅ Fair gameplay for all participants
- ✅ Proper state synchronization
- ✅ Disconnections handled

---

#### ✅ Module 6.4: Second Game + Matchmaking (7 pts) — Major
**Description:** Add another distinct game with matchmaking system

**Tasks:**
- [ ] **Design Second Game**
  - [ ] Different gameplay from first game
  - [ ] Define rules and mechanics
  - [ ] Implement rendering
  - [ ] Implement game logic
- [ ] **Matchmaking System**
  - [ ] Queue system (join/leave queue)
  - [ ] Skill-based matchmaking (ELO/MMR)
  - [ ] Auto-match players
  - [ ] Match confirmation (accept/decline)
  - [ ] Timeout for non-accepting players
- [ ] **Track Statistics**
  - [ ] Separate stats for second game
  - [ ] Rating system
  - [ ] Match history

**Database Tables:**
```sql
matchmaking_queue (id, user_id, game_type, skill_rating, joined_at)
```

**API Endpoints:**
- `POST /api/matchmaking/join` — Join queue
- `DELETE /api/matchmaking/leave` — Leave queue
- `GET /api/matchmaking/status` — Queue status
- `POST /api/matchmaking/accept` — Accept match

**Socket Events:**
- `matchmaking:joined` — Joined queue
- `matchmaking:match-found` — Match found
- `matchmaking:match-accepted` — Opponent accepted
- `matchmaking:match-declined` — Opponent declined

**Acceptance Criteria:**
- ✅ Second game is playable
- ✅ Matchmaking pairs players automatically
- ✅ Skill-based matching works
- ✅ Statistics tracked separately
- ✅ Performance maintained

---

## 🎯 Recommended Path to 60+ Points

### Strategy A: Balanced Approach (67 pts)
**Target 42 Subject Requirements:**

**Foundation (31 pts)**
1. Web Framework (7 pts)
2. Standard User Auth (7 pts)
3. WebSockets (7 pts)
4. Web-based Game (7 pts)
5. Notifications (1 pt)
6. OAuth 2.0 (1 pt)
7. 2FA (bonus, not counted)

**Advanced Gaming (14 pts)**
1. Advanced 3D Graphics (7 pts)
2. Remote Players (7 pts)

**Social & API (14 pts)**
1. Organization System (7 pts)
2. Public API (7 pts)

**Polish (8 pts)**
1. Design System (1 pt)
2. Advanced Search (1 pt)
3. File Upload System (1 pt)
4. Game Statistics (1 pt)
5. Game Customization (1 pt)
6. Gamification (1 pt)
7. User Analytics (1 pt)
8. Multi-Browser Support (1 pt)

**Total: 67 points** ✅

---

### Strategy B: Gaming Focus (70 pts)
**For teams prioritizing gameplay:**

**Foundation (31 pts)** — Same as Strategy A

**Advanced Gaming (21 pts)**
1. Advanced 3D Graphics (7 pts)
2. Remote Players (7 pts)
3. Multiplayer 3+ Players (7 pts)

**API & Social (7 pts)**
1. Public API (7 pts)

**Polish (11 pts)**
1. Organization System (7 pts) — Wait, this is 7 pts
2. Design System (1 pt)
3. Game Customization (1 pt)
4. Gamification (1 pt)
5. Game Statistics (1 pt)

**Total: 70 points** ✅

---

### Strategy C: Maximum Features (73+ pts)
**For experienced teams:**

**Foundation (31 pts)** — Same as Strategy A

**Advanced Gaming (14 pts)**
1. Advanced 3D Graphics (7 pts)
2. Second Game + Matchmaking (7 pts)

**Social & API (14 pts)**
1. Organization System (7 pts)
2. Public API (7 pts)

**Polish (14 pts)**
1. Design System (1 pt)
2. Advanced Search (1 pt)
3. File Upload System (1 pt)
4. Game Statistics (1 pt)
5. Game Customization (1 pt)
6. Gamification (1 pt)
7. User Analytics (1 pt)
8. Data Export/Import (1 pt)
9. GDPR Compliance (1 pt)
10. Multi-Browser Support (1 pt)
11. ORM (1 pt)
12. Advanced Search (already counted)

**Total: 73+ points** ✅✅

---

## 📝 Development Best Practices

### Code Quality
- Write unit tests for critical features (auth, game logic)
- Use ESLint + Prettier for consistent formatting
- Follow Vue 3 Composition API patterns
- Keep Express routes thin, business logic in controllers
- Use TypeScript (optional but recommended)

### Security
- Hash passwords with bcrypt (12 rounds minimum)
- Validate all inputs (client + server side)
- Use parameterized SQL queries (prevent injection)
- Implement rate limiting on API endpoints
- Set secure HTTP headers with Helmet
- Store JWT in httpOnly cookies (not localStorage)
- Sanitize user-generated content (XSS prevention)

### Performance
- Optimize Docker images (multi-stage builds)
- Use nginx for static file serving
- Index database columns (user_id, created_at, etc.)
- Implement pagination for large lists
- Optimize WebSocket message payloads
- Use connection pooling for database
- Compress API responses (gzip)

### Documentation
- Keep README.md updated with setup instructions
- Document API endpoints (use Swagger/OpenAPI)
- Write architecture documentation
- Comment complex game logic
- Create onboarding guide for new developers

---

## 🚀 Current Status

### ✅ Completed
- Docker infrastructure (nginx + postgres + backend + frontend)
- nginx reverse proxy on port 8080
- PostgreSQL database with migration system
- Vue 3 + Vite frontend
- Express.js backend
- Git repository initialized

### 🔄 In Progress
- None (starting fresh)

### 📋 Next Steps
1. Implement user registration and login (Module 3.1)
2. Set up JWT authentication
3. Create user profile pages
4. Implement friends system
5. Set up Socket.io for real-time features

---

**Last Updated:** February 12, 2026  
**Repository:** Fresh start with clean architecture  
**Minimum Target:** 14 points  
**Recommended Target:** 30+ points
