import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';

import { Game } from './Game.js';

const container = document.getElementById('game-container');
const game = new Game(container);

game.start();
