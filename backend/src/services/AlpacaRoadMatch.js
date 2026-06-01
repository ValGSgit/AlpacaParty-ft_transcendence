import { debug, error } from "#lib/logger.js";
import Game from "../models/Game.js";
import { BaseMatch } from "./BaseMatch.js";
import GamificationService from "./GamificationService.js";

const GAME_TYPE = "alpaca_road";
const MIN_RANKED_PLAYERS = 2;
const MAX_LANES = 4;
const HIT_TIMEOUT_MS = 1500; // auto-clear isHit if client never sends complete

export class AlpacaRoadMatch extends BaseMatch {
  constructor(id, namespace, roomName, onStateChange) {
    super(id, namespace, roomName, onStateChange);
    this.obstacles = [];
    this.tickRate = 33;
    this.isPlaying = false;

    this.level = 1;
    this.totalPoints = 0;
    this.roadSpeed = 0;
    this.timerMultiplier = 1.0;
    this.spawnTimer = 2.0;
    this.finalized = false;
    // Per-socket auto-clear timers for isHit. Kept off the player object
    // because Node's Timeout has circular internal pointers — including it
    // in syncLobby() (which broadcasts raw player objects) crashed
    // socket.io-parser's hasBinary() walk with a stack overflow.
    this.hitTimers = new Map();
    // Tracks the COUNTDOWN→PLAYING transition timer so stop() can cancel it
    // before it flips state on an already-torn-down match.
    this.countdownTimer = null;
    // Heartbeat is started lazily in addPlayer() once the first player
    // arrives — see SpitRoyaleMatch for the rationale. BaseMatch.stop()
    // clears it on teardown.
  }

  addPlayer(socket, name, color) {
    super.addPlayer(socket, name, color);
    const player = this.players.get(socket.id);

    // Find the lowest unused lane; clamp to MAX_LANES so an over-full lobby
    // (race condition past the MatchManager join cap) can't yield lane=4
    // and crash the client (playerPositions[4] is undefined).
    const taken = new Set(
      Array.from(this.players.values())
        .map((p) => p.lane)
        .filter((n) => Number.isInteger(n)),
    );
    let lane = 0;
    while (taken.has(lane) && lane < MAX_LANES) lane++;
    if (lane >= MAX_LANES) {
      super.removePlayer(socket.id);
      return socket.emit('join_error', { reason: 'lobby_full' });
    }

    player.lane = lane;
    player.isJumping = false;
    player.isActive = true;
    player.lastActive = Date.now();
    this._ensureHeartbeat();
    this.syncLobby();
  }

  start() {
    this.status = 'COUNTDOWN';
    this.initObstacles();
    this.broadcast('game_start');
    this.countdownTimer = setTimeout(() => {
      this.countdownTimer = null;
      this.status = 'PLAYING';
      this.isPlaying = true;
      this.roadSpeed = 30;
    }, 4000);
  }

  stop() {
    super.stop();
    this.isPlaying = false;
    this.obstacles = [];
    this.roadSpeed = 0;
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    // Drain any pending hit-clear timers so they don't fire after teardown.
    for (const t of this.hitTimers.values()) clearTimeout(t);
    this.hitTimers.clear();
  }

  removePlayer(socketId) {
    this._clearHitTimer(socketId);
    super.removePlayer(socketId);
  }

  // Schedule a server-side hit-clear so a dropped player_hit_complete
  // doesn't leave the player permanently invulnerable. Timer is stored
  // in a side map (NOT on the player) so it's never serialised.
  _scheduleHitClear(socketId) {
    const existing = this.hitTimers.get(socketId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      this.hitTimers.delete(socketId);
      const p = this.players.get(socketId);
      if (p && p.isHit) {
        p.isHit = false;
        this.syncLobby();
      }
    }, HIT_TIMEOUT_MS);
    this.hitTimers.set(socketId, t);
  }

  _clearHitTimer(socketId) {
    const t = this.hitTimers.get(socketId);
    if (t) {
      clearTimeout(t);
      this.hitTimers.delete(socketId);
    }
  }

  handlePlayerHit(socketId) {
    const player = this.players.get(socketId);
    if (!player || player.hp <= 0 || player.isDead || player.isHit) return;
    player.isHit = true;
    player.hp--;
    if (player.hp <= 0) player.isDead = true;
    this._scheduleHitClear(socketId);
    this.syncLobby();
  }

  handlePlayerHitComplete(socketId) {
    const player = this.players.get(socketId);
    if (player && player.isHit) {
      player.isHit = false;
      this._clearHitTimer(socketId);
      this.syncLobby();
    }
  }

  handlePlayerJump(socketId) {
    const player = this.players.get(socketId);
    if (player && !player.isDead && !player.isJumping) {
      player.isJumping = true;
      setTimeout(() => {
        if (this.players.has(socketId)) {
          this.players.get(socketId).isJumping = false;
        }
      }, 600);
    }
  }

  handleActive(socketId) {
    const player = this.players.get(socketId);
    debug("Handle active:", socketId);
    if (player && !player.isDead) {
      player.lastActive = Date.now();
      player.isActive = true;
    }
  }

  updateDifficulty() {
    const pointsPerLevel = 4 + this.level;
    const newLevel = Math.floor(this.totalPoints / pointsPerLevel) + 1;

    if (newLevel > this.level) {
      this.level = newLevel;
      const minSpeed = 30;
      const maxSpeed = 100;
      const factor = 0.08;
      const difficultyFactor = 1 - Math.exp(-factor * this.level);

      this.roadSpeed = minSpeed + (maxSpeed - minSpeed) * difficultyFactor;
      this.timerMultiplier = Math.max(0.5, this.timerMultiplier - 0.05);
      debug(`${this.level}: Speed: ${this.roadSpeed}, TimerMult: ${this.timerMultiplier}`, newLevel);

      this.broadcast('level_up', {
        level: this.level,
      });
    }
  }

  update() {
    // Stop emitting ticks once the match is over; the heartbeat is cleared
    // by stop() ~1.5s later, but we don't want to spam clients in the meantime.
    if (this.status === 'GAME_OVER') return;
    // Skip work if no players are present (e.g. created and immediately
    // abandoned). Pre-LOBBY noise was a minor CPU cost.
    if (this.players.size === 0) return;

    const tick = this.tickRate / 1000;
    let pointGained = false;

    if (this.isPlaying) {
      this.obstacles.forEach(obs => {
        obs.z -= this.roadSpeed * tick;
        if (obs.z < -0.25 && !obs.pointGiven) {
          obs.pointGiven = true;
          let awardedPoint = false;

          for (const player of this.players.values()) {
            if (!player.isDead && !player.isHit && player.isActive) {
              if (obs.isFull || player.lane === obs.lane) {
                player.points++;
                awardedPoint = true;
              }
            } else if (!player.isActive) {
              // Inactive players take damage but don't get parked in the
              // isHit state — otherwise resuming activity leaves them
              // permanently undamageable (handlePlayerHit's !player.isHit
              // guard would silently no-op).
              if (obs.isFull || player.lane === obs.lane) {
                player.hp--;
                if (player.hp <= 0) {
                  player.isDead = true;
                }
              }
            }
          }
          if (awardedPoint) {
            this.totalPoints++;
            pointGained = true;
          }
        }
      })

      if (pointGained) this.updateDifficulty();

      this.obstacles = this.obstacles.filter(obs => obs.z > -50);

      this.spawnTimer -= tick;
      if (this.spawnTimer <= 0) {
        this.createObstacle();
        this.spawnTimer = (1.0 + Math.random() * 2.0) * this.timerMultiplier;
      }
    }

    this.checkActivity();

    const playersArr = Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      point: p.points,
      isDead: p.isDead,
      isHit: p.isHit,
      isJumping: p.isJumping,
      isReady: p.isReady,
      lane: p.lane,
      color: p.color
    }));

    const allDead = playersArr.length > 0 && playersArr.every(p => p.isDead === true);
    if (allDead && this.status !== 'GAME_OVER') {
      // Flip status synchronously so further ticks bail (see L184 guard).
      this.status = 'GAME_OVER';
      // persistOutcome is fire-and-forget — it logs its own failures and the
      // 1.5s delay below lets the death animation play out before we tear
      // the match down.
      this.persistOutcome().catch((err) => {
        error('[alpaca-road] failed to persist outcome:', err?.message || err);
      });

      setTimeout(() => {
        this.isPlaying = false;
        this.broadcast('game_over');
        this.stop();
      }, 1500);
    }

    this.broadcast('tick', {
      obstacles: this.obstacles,
      players: playersArr,
      roadSpeed: this.roadSpeed
    });
  }

  initObstacles() {
    const amount = 8;
    const roadLength = 700;
    for (let i = 0; i < amount; ++i) {
      this.createObstacle(75 + (roadLength / amount) * i);
    }
  }

  createObstacle(pos = 700) {
    const activeLanes = Array.from(this.players.values()).filter(p => !p.isDead).map(p => p.lane);
    const targetLane = activeLanes.length > 0
      ? activeLanes[Math.floor(Math.random() * activeLanes.length)]
      : Math.floor(Math.random() * 4);

    this.obstacles.push({
      id: Math.random().toString(36),
      typeId: Math.floor(Math.random() * 2),
      lane: targetLane,
      z: pos,
      isFull: Math.random() > 0.6,
      pointGiven: false
    });
  }

  checkActivity() {
    if (!this.isPlaying) return;

    const now = Date.now();
    for (const player of this.players.values()) {
      if (!player.isDead && player.isActive) {
        if (now - player.lastActive > 3000) {
          debug(`Server: ${player.name} is inactive!`);
          player.isActive = false;
        }
      }
    }
  }

  async persistOutcome() {
    if (this.finalized) return;
    this.finalized = true;

    // Only rank authenticated participants.
    const ranked = Array.from(this.players.values()).filter((p) =>
      Number.isFinite(p.userId),
    );
    if (ranked.length < MIN_RANKED_PLAYERS) return;

    // Winner = highest score (everyone died, so this is the survival leader).
    // Ties → whoever appears first in the player list.
    const winner = ranked.reduce((best, p) =>
      p.points > best.points ? p : best,
    );

    await Promise.all(
      ranked.map(async (p) => {
        const isWinner = p.userId === winner.userId;
        const result = isWinner ? "win" : "loss";
        await Game.updateStats(p.userId, GAME_TYPE, result);
        // p.points is the server-tracked count of obstacles successfully
        // cleared in their lane — feed it into the obstacles leaderboard.
        if (p.points > 0) {
          await Game.incrementCounter(p.userId, GAME_TYPE, 'obstacles', p.points);
        }

        if (isWinner) {
          await GamificationService.onWin(p.userId, GAME_TYPE);
        } else {
          await GamificationService.onLoss(p.userId);
        }
        // "Road Warrior" = complete 5 stages. this.level is the furthest stage
        // the run reached; everyone who played the run shares it.
        await GamificationService.onAlpacaRoadStage(p.userId, this.level);
      }),
    );

    // Persist a Game row when exactly two players competed; >2-player runs
    // are reflected in GameStat only (Game schema is player1/player2 today).
    if (ranked.length === 2) {
      try {
        const [a, b] = ranked;
        const game = await Game.create({ player1Id: a.userId, gameType: GAME_TYPE });
        await Game.joinGame(game.id, b.userId);
        await Game.finishGame(game.id, {
          winnerId: winner?.userId ?? null,
          player1Score: a.points ?? 0,
          player2Score: b.points ?? 0,
        });
      } catch (err) {
        error('[alpaca-road] game-row persist failed:', err.message);
      }
    }
  }
}