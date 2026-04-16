import { GameClient } from './GameClient.js';

export class SpitRoyaleClient extends GameClient {
  constructor() {
    super('/spit-royale');
  }

  fireSpit() {
    this.emit('spit');
  }
}
