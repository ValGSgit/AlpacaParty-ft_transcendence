import { BaseMatch } from "./BaseMatch.js";

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
    this.heartbeat = setInterval(() => this.update(), this.tickRate);
  }

  addPlayer(socket, name, color) {
    super.addPlayer(socket, name, color);
    const player = this.players.get(socket.id);

    let assignedLane = 0;
    const takenLanes = Array.from(this.players.values()).map(p => p.lane);
    while (takenLanes.includes(assignedLane)) assignedLane++;

    player.lane = assignedLane;
    player.isJumping = false;
    this.syncLobby();
  }

  start() {
    this.status = 'COUNTDOWN';
    this.initObstacles();
    this.broadcast('game_start');
    setTimeout(() => {
      this.status = 'PLAYING';
      this.isPlaying = true;
      this.roadSpeed = 30;
    }, 4000)
  }

  stop() {
    super.stop();
    this.isPlaying = false;
    this.obstacles = [];
    this.roadSpeed = 0;
  }

  handlePlayerHit(socketId) {
    const player = this.players.get(socketId);
    if (player && player.hp > 0 && !player.isDead && !player.isHit) {
      player.isHit = true;
      player.hp--;
      if (player.hp <= 0) {
        player.isDead = true;
      }
      this.syncLobby();
    }
  }

  handlePlayerHitComplete(socketId) {
    const player = this.players.get(socketId);
    if (player && player.isHit) {
      player.isHit = false;
      this.syncLobby();
    }
  }

  //TODO:
  handlePlayerJump(socketId) {
    const player = this.players.get(socketId);
    if (player && !player.isDead && !player.isJumping) {
      player.isJumping = true;
      setTimeout(() => {
        if (this.players.has(socketId)) {
          this.players.get(socketId).isJumping = false;
        }
      }, 800);
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
      console.log(`${this.level}: Speed: ${this.roadSpeed}, TimerMult: ${this.timerMultiplier}`, newLevel);

      this.broadcast('level_up', {
        level: this.level,
      });
    }
  }

  update() {
    const tick = this.tickRate / 1000;
    let pointGained = false;

    if (this.isPlaying) {
      this.obstacles.forEach(obs => {
        obs.z -= this.roadSpeed * tick;
        if (obs.z < -0.25 && !obs.pointGiven) {
          obs.pointGiven = true;
          let awardedPoint = false;

          for (const [id, player] of this.players) {
            if (!player.isDead && !player.isHit) {
              if (obs.isFull || player.lane === obs.lane) {
                obs.pointGiven = true;
                player.points++;
                awardedPoint = true;
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
      this.status === 'GAME_OVER';

      setTimeout(() => {
        this.isPlaying = false;
        this.broadcast('game_over');
        this.stop()
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
}