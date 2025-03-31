import * as THREE from 'three';
import { Game } from './Game.js';

const container = document.getElementById('game-container');
const game = new Game(container);

game.start();
