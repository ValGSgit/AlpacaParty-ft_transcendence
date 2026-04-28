import { BaseMatch } from "./BaseMatch.js";

export class AlpacaRoadMatch extends BaseMatch {
  constructor(id, namespace, roomName, onStateChange) {
    super(id, namespace, roomName, onStateChange); // Load the BaseMatch template
    this.obstacles = [];
    this.roadSpeed = 25;
    this.spawnTimer = 2.0;
    this.tickRate = 33; // Run loop every 33 milliseconds
  }

  // Override the start function
  start() {
    this.status = 'PLAYING';
    this.broadcast('game_start', { message: "Get Ready!" });

    // Start the motor! Call this.update() 30 times a second
    this.heartbeat = setInterval(() => this.update(), this.tickRate);
  }

  // THE BOSS LOGIC LOOP
  update() {
    const dt = this.tickRate / 1000; // Time since last frame (0.033 seconds)

    // 1. Move Obstacles
    this.obstacles.forEach(obs => {
      obs.z -= this.roadSpeed * dt;
    });

    // 2. Delete old obstacles that passed the camera
    this.obstacles = this.obstacles.filter(obs => obs.z > -50);

    // 3. Spawn new obstacles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.obstacles.push({
        id: Math.random().toString(36).substr(2, 9), // Generate unique ID
        lane: Math.floor(Math.random() * 4),         // Pick lane 0, 1, 2, or 3
        z: 700,                                      // Start far away
        isFull: Math.random() > 0.8                  // 20% chance for full barricade
      });
      this.spawnTimer = 1.5; // Wait 1.5 seconds before spawning the next one
    }

    // 4. Send the "Snapshot" to everyone's screen
    this.broadcast('tick', {
      obstacles: this.obstacles,
      roadSpeed: this.roadSpeed,
      players: Array.from(this.players.values())
    });
  }
}