// LoadingMgr.js
import * as THREE from 'three';


/* ------------------------------------------------------------------ */
/* 1) DOM overlay                                                     */
const loadingDiv = document.createElement('div');
loadingDiv.style.cssText = `
  position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
  background:#000; color:#fff; font:18px/1 Arial, sans-serif; z-index:9999;`;
loadingDiv.textContent = 'Loading… 0 %';
document.body.appendChild(loadingDiv);

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
  if (pct > maxPct) {
    maxPct = pct;
    loadingDiv.textContent = `Loading… ${pct} %`;
  }
};

// Callback
loadingMgr.onLoad = () => {
  assetsReady = true;
  tryFinish();                 // might finish now, or wait for first frame
};

export { loadingMgr };
