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
    this.initObstacles();
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
    this.status = 'PLAYING';
    this.isPlaying = true;
    this.roadSpeed = 25;
    this.broadcast('game_start', { message: "Get Ready!" });
  }

  handlePlayerHit(socketId) {
    const player = this.players.get(socketId);
    player.isHit = true;
    if (player && player.hp > 0 && !player.isDead) {
      player.hp--;
      if (player.hp <= 0) {
        player.isDead = true;
      }
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

  updateDifficulty() {
    const pointsPerLevel = 4 + this.level;
    const newLevel = Math.floor(this.totalPoints / pointsPerLevel) + 1;

    if (newLevel > this.level) {
      this.level = newLevel;
      const minSpeed = 25;
      const maxSpeed = 100;
      const factor = 0.1;
      const difficultyFactor = 1 - Math.exp(-factor * this.level);

      this.roadSpeed = minSpeed + (maxSpeed - minSpeed) * difficultyFactor;
      this.timerMultiplier = Math.max(0.5, this.timerMultiplier - 0.05);
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
          this.totalPoints++;
          pointGained = true;

          for (const [id, player] of this.players) {
            if (!player.isDead && !player.isHit) {
              if (obs.isFull || player.lane === obs.lane) {
                player.points++;
              }
            }
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
      lane: p.lane,
      color: p.color
    }));

    const allDead = playersArr.length > 0 && playersArr.every(p => p.isDead === true);
    if (allDead && this.isPlaying) {
      this.isPlaying = false;
      this.broadcast('game_over'); // Tell clients to show the Game Over screen
      setTimeout(() => this.stop(), 2000); // Shut down the server loop
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
      this.createObstacle(roadLength / 3 + ((roadLength / 2) / amount * i));
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
      isFull: Math.random() > 0.8,
      pointGiven: false
    });
  }
}