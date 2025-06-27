// LoadingMgr.js
import * as THREE from 'three';
import { makeLoadingScreen } from './LoadingScreen.js';

/* ------------------------------------------------------------------ */
/* 1) DOM overlay                                                     */
const loadingDiv = document.createElement('div');
loadingDiv.style.cssText = `
  position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
  background:#000; color:#fff; font:18px/1 Arial, sans-serif; z-index:9999;`;
//loadingDiv.textContent = 'Loading… 0 %';
document.body.appendChild(loadingDiv);

// this will call the update() method of the loading screen
// every frame
function tick() {
  if(!scrn) return;
  scrn.update();
  requestAnimationFrame(tick);
}

/* build the fancy WebGL title */
let scrn = makeLoadingScreen('Loading');   // now returns object, not Promise
let currentPct  = 0;
loadingDiv.appendChild(scrn.canvas);              // canvas visible right away
scrn.setProgress(currentPct);                     // in case loaders fire early
tick();                                           // start its RAF loop

/* ------------------------------------------------------------------ */
/* Create the manager                            */
const loadingMgr = new THREE.LoadingManager();

let assetsReady      = false;
let firstFrameReady  = false;

function tryFinish() {
  if (assetsReady && firstFrameReady) {
    loadingDiv.style.transition = 'opacity .4s';
    loadingDiv.style.opacity    = 0;
    setTimeout(() => loadingDiv.remove(), 400);
  }
}

/* Listen for “first-render-complete” immediately  --------------- */
window.addEventListener(
  'first-render-complete',
  () => { 
    firstFrameReady = true; 
    tryFinish(); },
  { once: true }
);

// Callback
let maxPct = 0;
loadingMgr.onProgress = (_, loaded, total) => {
  const pct = Math.round((loaded / total) * 100);

  if (pct < maxPct) return;

  console.log('maxPct', maxPct, 'pct', pct);
  maxPct = pct;
  if (scrn) {
    scrn.setProgress(pct);
    console.log('Loading progress:', pct, '%');
  } 
}

// Callback
loadingMgr.onLoad = () => {
  assetsReady = true;
  scrn.setProgress(100);  // set to 100% when all assets are loaded
  tryFinish();                 // might finish now, or wait for first frame
};

export { loadingMgr };


window.addEventListener('resize', ()=>
{
  if(scrn) scrn.resize(window.innerWidth, window.innerHeight);
}, false);