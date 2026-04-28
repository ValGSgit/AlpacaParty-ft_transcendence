# Points

Pass with 14

### 🟢 Major Module

### 🟡 Minor Module

---

# 1. Web

### 🟢 Major: Use a framework for both the frontend and backend.

- [x] Use a frontend framework (Vue)
- [x] Use a backend framework (Express)

### 🟢 Major: Implement real-time features using WebSockets or similar technology.

- [ ] Real-time updates across clients.
- [ ] Handle connection/disconnection gracefully.
- [ ] Efficient message broadcasting.

### 🟢 Major: Allow users to interact with other users. The minimum requirements are:

- [ ] A basic chat system (send/receive messages between users).
- [x] A profile system (view user information).
- [ ] A friends system (add/remove friends, see friends list).

### 🟢 Major: A public API to interact with the database with a secured API key, rate limiting, documentation, and at least 5 endpoints:

- [x] GET /api/{something}
- [x] POST /api/{something}
- [x] PUT /api/{something}
- [x] DELETE /api/{something}

### 🟡 Minor: Use an ORM for the database.

- [x] prisma
  - ORM == Object-Relational Mapping

### 🟡 Minor: A complete notification system for all creation, update, and deletion actions.

- [ ] done

### 🟡 Minor: Custom-made design system with reusable components

- [x] propercolor palette
- [x] typography
- [x] icons
- [ ] minimum: 10 reusable components

### 🟡❓Minor: Implement advanced search functionality with:

- [x] filters
- [ ] sorting
- [ ] pagination

### 🟡❓Minor: File upload and management system.

- [ ] Support multiple file types (images, documents, etc.).
- [ ] Client-side and server-side validation (type, size, format).
- [ ] Secure file storage with proper access control.
- [ ] File preview functionality where applicable.
- [ ] Progress indicators for uploads.
- [ ] Ability to delete uploaded files.

---

# 2 Accessibility and Internationalization

### 🟡 Minor: Support for additional browsers.

- [x] Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge, etc.).
- [x] Test and fix all features in each browser.
- [ ] Document any browser-specific limitations.
- [x] Consistent UI/UX across all supported browsers.

---

# 3 User Management

### 🟢 Major: Standard user management and authentication.

- [x] Users can update their profile information.
- [ ] Users can upload an avatar (with a default avatar if none provided).
- [ ] Users can add other users as friends and see their online status.
- [ ] Users have a profile page displaying their information.

### 🟡❓Minor: Game statistics and match history (requires a game module).

- [ ] Track user game statistics (wins, losses, ranking, level, etc.).
- [ ] Display match history (1v1 games, dates, results, opponents).
- [ ] Show achievements and progression.
- [ ] Leaderboard integration.

### 🟡 Minor: Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.).

- [x] done

### 🟢❓Major: An organization system:

- [ ] Create, edit, and delete organizations.
- [ ] Add users to organizations.
- [ ] Remove users from organizations.
- [ ] View organizations and allow users to perform specific actions within an organization (minimum: create, read, update).

---

# 6 Gaming and user experience

### 🟢 Major: Implement a complete web-based game where users can play against each other.

- [ ] The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card
      games, etc.).
- [x] Players must be able to play live matches.
- [x] The game must have clear rules and win/loss conditions.
- [x] The game can be 2D or 3D.

### 🟢 Major: Remote players — Enable two players on separate computers to play the same game in real-time.

- [ ] Handle network latency and disconnections gracefully.
- [ ] Provide a smooth user experience for remote gameplay.
- [ ] Implement reconnection logic.

### 🟢 Major: Multiplayer game (more than two players).

- [x] Support for three or more players simultaneously.
- [x] Fair gameplay mechanics for all participants.
- [ ] Proper synchronization across all clients.

### 🟢 ❌Major: Add another game with user history and matchmaking.???

- [ ] Implement a second distinct game.
- [ ] Track user history and statistics for this game.
- [ ] Implement a matchmaking system.
- [ ] Maintain performance and responsiveness.

### 🟢 Major: Implement advanced 3D graphics using a library like Three.js or Babylon.js.

- [x] Create an immersive 3D environment.
- [x] Implement advanced rendering techniques.
- [x] Ensure smooth performance and user interaction.

### 🟡 Minor: Game customization options.

- [x] Power-ups, attacks, or special abilities.
- [x] Different maps or themes.
- [x] Customizable game settings.
- [x] Default options must be available.

### 🟡❌ Minor: A gamification system to reward users for their actions.

- [ ] Implement at least 3 of the following: achievements, badges, leaderboards, XP/level system, daily challenges, rewards
- [ ] System must be persistent (stored in database)
- [ ] Visual feedback for users (notifications, progress bars, etc.)
- [ ] Clear rules and progression mechanics  8 Data and Analytics

### 🟡❌ Minor: Data export and import functionality.

- [ ] Export data in multiple formats (JSON, CSV, XML, etc.).
- [ ] Import data with validation.
- [ ] Bulk operations support.

### 🟡❌ Minor: GDPR compliance features.

- [ ] Allow users to request their data.
- [ ] Data deletion with confirmation.
- [ ] Export user data in a readable format.
- [ ] Confirmation emails for data operations.
