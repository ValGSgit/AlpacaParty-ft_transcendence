import { BaseMatch } from "./BaseMatch.js";

export class AlpacaRoadMatch extends BaseMatch {
  constructor(id, namespace, roomName, onStateChange) {
    super(id, namespace, roomName, onStateChange); // Load the BaseMatch template
    this.obstacles = [];
    this.tickRate = 5; // TODO: Change
  }

  start() {
    this.status = 'PLAYING';

    this.level = 1;
    this.totalPoints = 0;
    this.roadSpeed = 25;
    this.timerMultiplier = 1.0;
    this.spawnTimer = 2.0;
    this.obstacles = [];
    this.initObstacles();

    this.broadcast('game_start', { message: "Get Ready!" });
    this.heartbeat = setInterval(() => this.update(), this.tickRate);
  }

  handlePlayerHit(socketId) {
    const player = this.players.get(socketId);
    if (player && player.hp > 0 && !player.isDead) {
      player.hp--;
      if (player.hp <= 0) {
        player.isDead = true;
      }
      this.syncLobby();
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

    // Move Obstacles and check for points
    this.obstacles.forEach(obs => {
      obs.z -= this.roadSpeed * tick;

      // If it passed the player, award a point!
      if (obs.z < -0.25 && !obs.pointGiven) {
        obs.pointGiven = true;
        this.totalPoints++;
        pointGained = true;

        // Give points to all players who are still alive
        for (const [id, player] of this.players) {
          if (!player.isDead) player.points++;
        }
      }
    })

    if (pointGained) this.updateDifficulty();

    // Delete old obstacles
    this.obstacles = this.obstacles.filter(obs => obs.z > -50);

    // Spawn new obstacles
    this.spawnTimer -= tick;
    if (this.spawnTimer <= 0) {
      this.createObstacle();
      this.spawnTimer = (1.0 + Math.random() * 2.0) * this.timerMultiplier;
    }

    const playersArr = Array.from(this.players.values()).map(p => ({
      id: p.id,
      hp: p.hp,
      point: p.points,
      isDead: p.isDead
    }));

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

  //needs fixes - lane should be chosen of active players
  createObstacle(pos = 700) {
    this.obstacles.push({
      id: Math.random().toString(36),
      typeId: Math.floor(Math.random() * 2),
      lane: Math.floor(Math.random() * 4),
      z: pos,
      isFull: Math.random() > 0.8,
      pointGiven: false
    });
  }

}