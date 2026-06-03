# Points

**Required to pass: 14 points** — Major = 2 pts, Minor = 1 pt.
**AlpacaParty claims 25 points** (9 Major × 2 + 7 Minor × 1) — intentional headroom in case any module is contested at peer evaluation.

> This file is the authoritative claim ledger and must stay in sync with
> the module table in [`README.md`](README.md). When the two diverge, the
> README wins.

### 🟡 Minor Module

---

# 1. Web

### 🟢 Major: Use a framework for both the frontend and backend.

- [x] Use a frontend framework (Vue)
- [x] Use a backend framework (Express)

### 🟢 Major: Implement real-time features using WebSockets or similar technology.

- [x] Real-time updates across clients.
- [x] Handle connection/disconnection gracefully.
- [x] Efficient message broadcasting.

### 🟢 Major: Allow users to interact with other users. The minimum requirements are:

- [x] A basic chat system (send/receive messages between users).
- [x] A profile system (view user information).
- [x] A friends system (add/remove friends, see friends list).

### 🟢 Major: A public API to interact with the database with a secured API key, rate limiting, documentation, and at least 5 endpoints:

- [x] GET /api/{something}
- [x] POST /api/{something}
- [x] PUT /api/{something}
- [x] DELETE /api/{something}

### 🟡 Minor: Use an ORM for the database.

- [x] **Prisma** with `@prisma/adapter-pg` across 22 models, with migrations and seed data

### 🟡 Minor: A complete notification system for all creation, update, and deletion actions.

- [x] done

### 🟡 Minor: Custom-made design system with reusable components

- [x] propercolor palette
- [x] typography
- [x] icons
- [x] minimum: 10 reusable components

### 🟡 Minor: Implement advanced search functionality with:

- [x] filters
- [x] sorting
- [x] pagination

### 🟡❓Minor: File upload and management system.

- [x] Support multiple file types (images, documents, etc.).
- [x] Client-side and server-side validation (type, size, format).
- [x] Secure file storage with proper access control.
- [x] File preview functionality where applicable.
- [x] Progress indicators for uploads.
- [x] Ability to delete uploaded files.

---

# 2 Accessibility and Internationalization

### 🟡 Minor: Support for additional browsers.

- [x] Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge, etc.).
- [x] Test and fix all features in each browser.
- [x] Document any browser-specific limitations.
- [x] Consistent UI/UX across all supported browsers.

---

# 3 User Management

### 🟢 Major: Standard user management and authentication.

- [x] Users can update their profile information.
- [x] Users can upload an avatar (with a default avatar if none provided).
- [x] Users can add other users as friends and see their online status.
- [x] Users have a profile page displaying their information.

---

# 4 Artificial Intelligence

=======
### 🟢 Major: Implement a complete LLM system interface.

- [x] Generate text and/or images based on user input.
- [x] Handle streaming responses properly.
- [x] Implement error handling and rate limiting.

---

# 6 Gaming and user experience

### 🟢 Major: Implement a complete web-based game where users can play against each other.

- [x] Real-time multiplayer arena over Socket.IO (`/minigames` namespace)
- [x] Two players on separate computers play live; up to 10 players in a single arena
- [x] Live matches with clear rules and win/loss conditions (last alpaca standing)
- [x] 3D rendering via Three.js
- [x] Network latency and disconnections handled gracefully (`MatchManager` cleans up dropped players; Socket.IO `connectionStateRecovery` restores presence)

### 🟢 Major: Remote players — Enable two players on separate computers to play the same game in real-time.

- [x] Handle network latency and disconnections gracefully.
- [x] Provide a smooth user experience for remote gameplay.
- [ ] Implement reconnection logic.

### 🟢 Major: Multiplayer game (more than two players).

- [x] Support for three or more players simultaneously.
- [x] Fair gameplay mechanics for all participants.
- [x] Proper synchronization across all clients.

### 🟢❌ Major: Add another game with user history and matchmaking.???

- [ ] Implement a second distinct game.
- [ ] Track user history and statistics for this game.
- [ ] Implement a matchmaking system.
- [ ] Maintain performance and responsiveness.

### 🟢 Major: Implement advanced 3D graphics using a library like Three.js or Babylon.js.

- [x] Create an immersive 3D environment.
- [x] Implement advanced rendering techniques.
- [x] Ensure smooth performance and user interaction.

- [x] **Achievements** — `first_win`, `win_streak_5`, `level_10`, `social_butter` (10 friends), `first_post`, `org_founder`
- [x] **Leaderboards** — leaderboards by kills (Spit Royale), obstacles (Alpaca Road), and coins
- [x] **XP / level system** — XP for wins (with bonuses for accuracy, eliminations, powerups, survival time, flawless), losses, posts, challenges; auto level-up
- [x] **Daily challenges** — rotate daily, persisted completions per user
- [x] **Rewards** — coin economy for the farm, XP bonuses
- [x] Fully persistent in the database (`UserStats`, `Achievement`, `UserAchievement`, `DailyChallenge`, `UserDailyChallenge`, `AlpacaFarm.coins`)
- [x] Visual feedback — real-time notifications, XP progress bars, achievement unlock toasts
- [x] Clear rules and progression mechanics, documented in-app

- [x] Power-ups, attacks, or special abilities.
- [x] Different maps or themes.
- [x] Customizable game settings.
- [x] Default options must be available.

# Point Total

| # | Module | Category | Type | Pts |
|---|--------|----------|------|-----|
| 1 | Frontend + Backend frameworks (Vue 3 + Express.js) | Web | Major | 2 |
| 2 | Real-time features (Socket.IO, 2 namespaces) | Web | Major | 2 |
| 3 | User interaction (chat + profile + friends) | Web | Major | 2 |
| 4 | Public API (6 endpoints, key + rate limit + Swagger) | Web | Major | 2 |
| 5 | ORM (Prisma, 22 models) | Web | Minor | 1 |
| 6 | Notification system | Web | Minor | 1 |
| 7 | File upload and management | Web | Minor | 1 |
| 8 | Standard user management + authentication | User Mgmt | Major | 2 |
| 9 | Game statistics & match history | User Mgmt | Minor | 1 |
| 10 | LLM system interface (Groq help desk) | AI | Major | 2 |
| 11 | Web-based game (Spit Royale) | Gaming | Major | 2 |
| 12 | Add another game (Alpaca Road) with matchmaking | Gaming | Major | 2 |
| 13 | Advanced 3D graphics (Three.js) | Gaming | Major | 2 |
| 14 | Game customization | Gaming | Minor | 1 |
| 15 | Gamification | Gaming | Minor | 1 |

**Total: 25 points** — 11 points above the 14-point mandatory bar, with surplus reserved as evaluation headroom.

> Per the subject, the bonus part is capped at **5 additional points** beyond the required 14. The team's primary claim is the 14-point core; the surplus modules are documented to absorb any module that fails to pass peer evaluation.

- [x] Implement at least 3 of the following: achievements, badges, leaderboards, XP/level system, daily challenges, rewards
- [x] System must be persistent (stored in database)
- [x] Visual feedback for users (notifications, progress bars, etc.)
- [x] Clear rules and progression mechanics

### 🟡❌ Minor: Data export and import functionality.

- [ ] Export data in multiple formats (JSON, CSV, XML, etc.).
- [ ] Import data with validation.
- [ ] Bulk operations support.

### 🟡❌ Minor: GDPR compliance features.

- [ ] Allow users to request their data.
- [ ] Data deletion with confirmation.
- [ ] Export user data in a readable format.
- [ ] Confirmation emails for data operations.

### 🟢 Module of choice

- [ ] Sandbox game
- [ ] Collisions
- [ ] Edit mode
- [ ] Shop
- [ ] visit other farms
- [ ] custom 3d models
- [ ] animals running around
