# Library & API Cheatsheet

A reference for the runtime APIs the project leans on. Aimed at "I see this in
the code, what does it do and what are the gotchas?" — not at re-teaching the
language. Each entry shows the relevant signature + a one-liner of what it
*actually* does in the codebase, with file references where useful.

---

## 1. JavaScript built-ins

### RegExp

| Form | What it does |
|---|---|
| `/pattern/flags` | Literal regex. `g` = global (find all), `i` = case-insensitive, `s` = `.` matches newline, `m` = `^/$` per-line, `u` = unicode. |
| `new RegExp(str, flags)` | Build a regex from a string — needed when the pattern is computed (e.g. `<${tag}\\b...>`). Inside a string literal, every `\` must be doubled. |
| `re.test(str)` | Returns `true`/`false`. Cheap. |
| `str.replace(re, repl)` | Replaces first match unless `re` has `g`. `repl` can be a function `(match, ...captures) => string`. |
| `(?:...)` | Non-capturing group. Use this when you don't need the group's value — keeps the captures array clean. |
| `(...)` | Capturing group. `$1`/`\1` references its match. |
| `\1` backreference | "Same text as group 1." We use `<(${TAG})>[\s\S]*?</\1>` so `<script>...</script>` matches but `<script>...</style>` doesn't. With the `i` flag, the backref is also case-insensitive. |
| `*?` / `+?` | Lazy quantifiers — match as little as possible. `[\s\S]*?<\/script>` stops at the **first** `</script>`, not the last. |
| `[^>]*` | "Anything except `>`." Used to skip a tag's attributes without crossing the tag boundary. |
| `\b` | Word boundary. `<script\b` ensures we don't half-match `<scripty>`. |
| `\s` / `\S` | Whitespace / non-whitespace. `[\s\S]` is the idiom for "any character including newlines" (cheaper than the `s` flag in older engines). |

> Patterns in [htmlSanitizer.js](backend/src/utils/htmlSanitizer.js) and the
> sanitizer loop runs until output stabilises so reassembly bypasses
> (`<scr<script>ipt>`) collapse instead of just shifting.

### Promise / async-await

- `async function` always returns a Promise. `return v` resolves with `v`; `throw e` rejects.
- `await p` suspends until `p` settles, then returns the resolved value or throws the rejection.
- `Promise.all([a, b, c])` runs them concurrently, resolves with an array. **Rejects on the first failure**, but the other promises keep running — be careful with side-effects.
- `Promise.allSettled([...])` resolves with `[{status, value|reason}]`. Use when "tell me what worked and what didn't" matters more than fail-fast.
- `p.catch(fn)` swallows rejection; we use `someFireAndForget().catch(() => {})` for non-critical background work (e.g. `GamificationService.onMessageSent(...)`).
- `Promise.resolve(v)` wraps a value in a resolved promise — useful as a no-op default branch (see `Post.getFeed`'s `liked` query when no viewer).

### Map / Set / WeakMap

- `new Map()` — keyed by reference identity for objects, by value for primitives. Order is insertion order. Use for socketId→player tables (`this.players`).
- `map.set(k, v)`, `map.get(k)`, `map.has(k)`, `map.delete(k)`, `map.size`, `map.values()/keys()/entries()`.
- `new Set([...])` — unique values. `new Set(arr).size` deduplicates. We use this in [Friend.js](backend/src/models/Friend.js) for `relationFlagsForMany`.
- `WeakMap` — keys are objects, garbage-collected when the key is unreachable. Use when associating data with an object you don't own. Not currently used here, but useful for "metadata for a DOM node."

### Timers

- `setTimeout(fn, ms)` → returns a handle. `clearTimeout(handle)` cancels.
- `setInterval(fn, ms)` → repeats every `ms`. `clearInterval(handle)` cancels. **Leaks if forgotten** — see [BaseMatch.stop()](backend/src/services/BaseMatch.js) where we null the handle after `clearInterval` so the lazy-start guard remains correct.
- Node's `Timeout` object has internal circular pointers — never serialise it (it crashes `socket.io-parser`'s `hasBinary` walk; see comment in [AlpacaRoadMatch.js](backend/src/services/AlpacaRoadMatch.js)).

### Numeric guards

- `Number.isFinite(n)` — true for real numbers only. Rejects `NaN`, `±Infinity`, **and** non-number types (unlike global `isFinite` which coerces).
- `Number.isInteger(n)` — same, plus must be an integer.
- `Number(v) || fallback` — short-circuits on `0` (since `0` is falsy). Prefer `Number.isFinite(Number(v)) ? Number(v) : fallback` when `0` is valid.
- `Math.hypot(a, b)` = `Math.sqrt(a*a + b*b)` but numerically stable for huge/tiny values. Used in arena distance checks.

### Optional chaining + nullish coalescing

- `a?.b?.c` — short-circuits to `undefined` on first nullish hop.
- `a ?? b` — `b` only when `a` is `null`/`undefined` (NOT for `0`/`""`/`false`).
- `a ??= b` — assign `b` if `a` is nullish. Used in the per-socket rate-limit bucket: `socket._buckets ??= {}`.
- `fn?.()` — call only if `fn` is callable. Used for optional `ack?.(...)` socket callbacks.

### Spread / destructure

- `{...obj, override: 1}` — shallow clone with override.
- `const { a, b, ...rest } = obj` — pull fields out, collect remainder.
- `const [a, ...tail] = arr` — same for arrays.
- Inside Prisma `where` clauses, **conditional spread** is the readable way to add optional filters: `{ ...(vid !== null && { OR: [...] }) }`.

---

## 2. Node built-ins

### `crypto`

- `randomUUID()` — RFC 4122 v4 UUID string. Used for match room ids.
- `randomBytes(n)` — `n` cryptographically-strong random bytes (returns `Buffer`). Use for API keys / tokens, not for UUIDs (use `randomUUID`).

### `bcrypt`

- `bcrypt.hash(plain, rounds)` → Promise<hash>. `rounds=12` ≈ 250 ms per hash on modern hardware. Higher is safer but slower.
- `bcrypt.compare(plain, hash)` → Promise<boolean>. **Constant-time**, so OK against timing attacks. Always `await` it.

### `jsonwebtoken`

- `jwt.sign(payload, secret, { expiresIn, algorithm })` → token string.
- `jwt.verify(token, secret, { algorithms: ["HS256"] })` → decoded payload, or throws. Always pin `algorithms` — without it, attackers can forge tokens by setting `alg: "none"`.
- We catch + return `null` on failure (see [authService.js](backend/src/services/authService.js)) so callers don't have to wrap try/catch.

---

## 3. Express

```js
import express from "express";
const router = express.Router();
router.use(middleware);
router.get("/path", handler);
router.post("/path", limiter, validator, handler);
```

- **Middleware signature**: `(req, res, next) => { ... next() }`. Throw or call `next(err)` to jump to the error handler.
- **Error handler signature**: `(err, req, res, next) => { ... }` — four args, that's how Express recognises it.
- `req.cookies.jwt_token` — populated by `cookie-parser` middleware.
- `req.user` — we attach this in `authenticate`. Downstream handlers can rely on it.
- `req.body` — populated by `express.json({ limit: "..." })`. **The limit is per-route**; tighten on auth endpoints (4 KB) so credential-stuffing attackers can't waste parser time on giant bodies.
- `res.status(n).json(body)` — Express auto-sets `Content-Type: application/json`.

### `express-rate-limit`

```js
rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  skipSuccessfulRequests: true,  // only count failures (login)
  standardHeaders: true,         // RateLimit-* headers
  legacyHeaders: false,          // suppress X-RateLimit-*
});
```

- `skipSuccessfulRequests` on `/login` is the trick that prevents legitimate users on flaky networks from being locked out.

---

## 4. Prisma

A typed query builder. We call it as `prisma.<model>.<verb>`.

### Reads

- `findUnique({ where: { id } })` — unique-index lookup, returns row or `null`.
- `findFirst({ where, orderBy })` — first match across non-unique conditions.
- `findMany({ where, include, select, take, skip, orderBy })` — list. `take`/`skip` are limit/offset.
- `count({ where })` — count without fetching rows.

### Writes

- `create({ data })` — insert. Throws `P2002` on unique-constraint violation.
- `update({ where: { id }, data })` — single-row update. Throws `P2025` if not found.
- `updateMany({ where, data })` — bulk update; returns `{ count }`. **Doesn't throw on zero matches** — that's why [Post.update](backend/src/models/Post.js) uses `updateMany({ where: { id, authorId } })` for atomic ownership-checked updates.
- `upsert({ where, update, create })` — update if exists, else insert. Idempotent.
- `deleteMany({ where })` — returns `{ count }`. Same "no-throw on zero" behavior.

### Nested + relational

- `include: { author: { select: { username: true } } }` — eager-load a relation.
- `where: { author: { userSettings: { isPublic: true } } }` — filter through a relation.
- `data: { likesCount: { increment: 1 } }` — atomic counter (DB-level `+= 1`).
- `data: { skipDuplicates: true }` on `createMany` — silently drop rows that violate a unique constraint.
- `$transaction([op1, op2])` — array form runs sequentially in one transaction.
- `$transaction(async (tx) => {...})` — function form for interactive transactions. Use `tx` instead of `prisma` inside.

### Error codes (the ones we handle)

| Code | Meaning | Status |
|---|---|---|
| `P2000` | Value too long | 400 |
| `P2002` | Unique constraint violation | 409 |
| `P2025` | Record not found | 404 |

See [errorHandler.js](backend/src/middleware/errorHandler.js).

---

## 5. Socket.IO (server)

```js
import { Server } from "socket.io";
const io = new Server(httpServer, { cors, connectionStateRecovery });
```

### Namespaces vs rooms

- **Namespace** (`io.of("/foo")`) — a fully separate connection endpoint. Has its own middleware chain. We use `/minigames` for match traffic so general traffic doesn't share handlers.
- **Room** (`socket.join("user:42")`) — a tag inside a namespace. A socket can be in many rooms. `io.to("room").emit(...)` sends to every socket currently in that room.

### Middleware

- `io.engine.use(middleware)` — runs once at the Engine.IO upgrade. We use it for `cookie-parser` so cookies are available before the namespace middleware runs.
- `io.use(fn)` — applies only to the default namespace (`"/"`).
- `nsp.use(fn)` — applies only to that namespace. Custom namespaces (like `/minigames`) need their **own** `.use(...)` — `io.use` does NOT cover them. Without this, our `/minigames` socket had no JWT check and `socket.user` was undefined; see [socketService.js](backend/src/services/socketService.js).

### Socket lifecycle

- `socket.on("event", handler)` — listen. Handler args are whatever the client emitted. Last arg can be an `ack` callback if the client used the with-ack form.
- `socket.off("event", handler)` — unbind a specific handler (need the same function reference). Critical to avoid double-binding when the same socket re-authenticates; see [App.vue](frontend/src/App.vue).
- `socket.emit("event", payload, ack?)` — send to that one socket.
- `socket.broadcast.emit(...)` — to everyone in the namespace **except** this socket.
- `io.emit(...)` — to everyone in the namespace.
- `io.to(room).emit(...)` / `socket.to(room).emit(...)` — to a room.
- `socket.join(room)` / `socket.leave(room)` — manage membership.
- `socket.disconnect(close)` — terminate. `close = true` shuts the underlying connection too.
- `connectionStateRecovery` — buffers state so a momentary network glitch doesn't lose missed events. Bounded by `maxDisconnectionDuration`.

### Why `shapePlayer` / `_SAFE_PLAYER_FIELDS` exist

`socket.io-parser` walks the payload looking for binary data. If you let it
walk a Node `Timeout` or a raw socket object, its internal circular pointers
crash the parser (stack overflow). We whitelist primitive fields before
broadcasting — see [BaseMatch.js](backend/src/services/BaseMatch.js).

### `NotificationService.setIo(io)` — dependency injection

```js
// socketService.js
NotificationService.setIo(io);

// notificationService.js
let io = null;
const NotificationService = {
  setIo(ioInstance) { io = ioInstance; },
  notify({ userId, ... }) {
    if (io) io.to(`user:${userId}`).emit("notification", ...);
  },
};
```

The notification module is imported all over the place (HTTP controllers,
match outcome handlers, etc.) but only one module — `socketService` — owns
the live `io` instance. Rather than `import io from "..."` (which would
trigger circular dependencies), we *inject* it once at startup. The module
holds a private `let io = null` that the setter mutates.

---

## 6. socket.io-client (frontend)

Largely mirrors the server API.

```js
import { io } from "socket.io-client";
const socket = io("/minigames", { withCredentials: true });

socket.on("event", handler);
socket.off("event", handler);   // single handler
socket.off("event");            // all handlers for event
socket.disconnect();
socket.connect();
```

- We track bound handlers in a "handler table" (one object literal) so we
  unbind exactly what we bound. Re-binding without unbinding causes
  duplicate event firing (the bug fixed in the 2026-05-26 cleanup commit).

---

## 7. Three.js

### Renderer / canvas

- `new THREE.WebGLRenderer({ antialias, alpha })` — owns the WebGL context and the `<canvas>`.
- `renderer.setSize(w, h)` — canvas + drawing-buffer size. Re-call on viewport resize.
- `renderer.setPixelRatio(devicePixelRatio)` — HiDPI. Don't go above 2 on mobile or fill rate dies.
- `renderer.render(scene, camera)` — one frame.
- `renderer.dispose()` — releases GPU programs but **NOT the canvas**.
- `renderer.forceContextLoss()` — explicitly drop the WebGL context. Lets the browser reclaim GPU memory immediately.
- `renderer.domElement.remove()` — pull the canvas out of the DOM.

### Scenes & objects

- `new THREE.Scene()` — root container. `.add(obj)` / `.remove(obj)` / `.children`.
- `.background` — a `Color` (no `dispose`) **or** a `Texture` (has `dispose`). Branch on `typeof bg.dispose === "function"`.
- `.fog` — `Fog` or `FogExp2`. No GPU resource; setting to `null` is enough.
- `scene.traverse(cb)` — depth-first walk including the root. Callback runs for **every** node — there's no early-exit; if you `return` it only skips that node's callback body, not its children.

### Resources & disposal

`Geometry`, `Material`, and `Texture` all hold GPU resources. They live until
you call `.dispose()` OR the context is force-lost. Crucially, **clones
share these** unless you explicitly clone the geometry/material too.

- `mesh.geometry.dispose()` — drops VBOs.
- `mat.dispose()` — drops shader program + uniforms.
- `tex.dispose()` — drops the GPU texture.

> See [modelCache.js](frontend/src/games/core/modelCache.js): cached scenes
> are tagged with `userData.shared = true` so `clearScene()` skips disposing
> them. Disposing a shared material destroys it for every clone that still
> uses it — that's the "white trees" bug.

### Cloning

- `obj.clone()` — copies the scene graph; geometries and materials are **shared by reference**.
- `SkeletonUtils.clone(model)` — same as `.clone()` but also rebinds skeleton bones for skinned meshes. Still shares geometry/material.
- If you want truly independent material/geometry, call `.clone()` on those too — but expect a GPU memory hit.

### Post-processing

- `EffectComposer(renderer, renderTarget?)` — wraps multiple passes into an offscreen render pipeline.
- `RenderPass(scene, camera)` — first pass; draws the actual scene.
- `BokehPass(scene, camera, { focus, aperture, maxblur })` — depth-of-field. Disable per-frame with `bokehPass.enabled = false` instead of removing/recreating.
- `OutputPass()` — final tone-mapping / color-space conversion to the screen.
- `composer.setPixelRatio(...)`, `composer.setSize(w, h)` — keep in sync with the renderer.
- `composer.dispose()` — frees passes + render targets the composer owns. **Does NOT dispose the constructor-supplied render target** — track that one yourself.

### Loaders

- `new GLTFLoader().load(path, onLoad, onProgress, onError)` — async, callback-based. Returns nothing useful; wrap in a Promise (see [modelCache.js](frontend/src/games/core/modelCache.js)).

---

## 8. Vue 3 (Composition API)

### Reactivity

- `ref(v)` — reactive single value. Access via `.value`. **Deeply reactive** for nested objects.
- `shallowRef(v)` — reactive only at `.value` reassignment; nested mutations are NOT tracked. **Required for Three.js objects** — deep proxying a Mesh / Scene would proxy every internal field and tank performance.
- `reactive(obj)` — deeply reactive object. Don't use it for non-plain objects (Maps, Sets, class instances) unless you understand the proxy implications.
- `markRaw(obj)` — opt-out of reactivity for that specific object. Used in [createObjects.js](frontend/src/games/core/createObjects.js) so the entity instances don't get proxied.
- `computed(() => expr)` — memoised derived value. Re-evaluates only when its dependencies change.
- `watch(source, cb, { immediate, deep })` — observe a ref/computed.
- `watchEffect(cb)` — auto-track everything `cb` reads.

### Lifecycle hooks (run inside `setup()` / `<script setup>`)

- `onMounted(cb)` — after the component is in the DOM.
- `onUnmounted(cb)` — cleanup. **Always pair every `addEventListener` / `socket.on` / `setInterval` started in `onMounted` with the matching teardown here.**
- `onBeforeUnmount(cb)` — just before teardown; the DOM is still around.

### Composables

A composable is just a function that uses Vue APIs. Convention: prefix with
`use`. `useGameEngine(containerRef)` returns `{ init, cleanup, ... }` plus
the shallowRefs it owns. Each call creates a fresh closure — that's why
`bokehPass` is a local `let` inside the function.

---

## 9. Pinia (frontend state)

```js
import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({ user: null, isAuthenticated: false }),
  getters: { username: (s) => s.user?.username },
  actions: { async login(...) { ... } },
});
```

- Stores are singletons within a Pinia instance.
- `useAuthStore()` returns the same instance every time inside the same app.
- For tests: `createPinia()` + `setActivePinia(...)` to get a fresh store per test.
- **Don't import stores at module top-level** outside Vue scope — they need an active Pinia. Wrap in functions or call inside lifecycle hooks.

---

## 10. Common project patterns

### Token-bucket rate limiter

```js
function takeToken(socket, event) {
  const cfg = RATE_LIMITS[event];
  if (!cfg) return true;
  socket._buckets ??= {};
  const b = socket._buckets[event] ??= { tokens: cfg.capacity, ts: Date.now() };
  const elapsed = (Date.now() - b.ts) / 1000;
  b.tokens = Math.min(cfg.capacity, b.tokens + elapsed * cfg.refillPerSec);
  b.ts = Date.now();
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}
```

Capacity = burst size. Refill rate = sustained rate. Beats fixed windows
because clients can't game the boundary (`19 ops at 59s, 19 ops at 60s`).

### `shapeX` functions

We have `shapePost`, `shapeFriend`, `shapeUserForClient`, `shapePlayer`. They
all do the same thing: take a raw DB row / internal player object, return a
plain object with only the fields the frontend should see. This is the
"never serialise the raw value" rule — see the `socket.io-parser` crash note
under Socket.IO.

### `Object.assign(new Error(), { status })` vs `CustomError`

Both work — the [errorHandler](backend/src/middleware/errorHandler.js) reads
either. New code should use `CustomError(message, statusCode)` for
readability; it sets the right name and captures the stack trace at the
throw site.

### `[[name]]`-style links in this doc

These reference other memory or doc files in the project's notes system —
ignore them unless you're working inside Claude's memory directory.
