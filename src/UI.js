export class UI {
  constructor() {

    /* ---------------------------------------------------------------
        Single shared button stylesheet – only create it once
    ---------------------------------------------------------------- */
    if (!document.getElementById('ui-btn-style')) {
      const style = document.createElement('style');
      style.id = 'ui-btn-style';
      style.textContent = `
        /* generic behaviour for every palette button */
        .ui-btn{
          width:48px;                     /* square hit-target               */
          aspect-ratio:1;
          cursor:grab;
          transition:filter .15s,transform .1s;
        }
        .ui-btn:hover  { filter:drop-shadow(0 0 8px var(--glow)); }
        .ui-btn:active { transform:scale(.93); cursor:grabbing; }

        /* individual colour tints ---------------------------------- */
        .turret-btn  { --glow:#0f0; filter:drop-shadow(0 0 4px var(--glow)); }
        .molotov-btn { --glow:#f60; filter:drop-shadow(0 0 4px var(--glow)); }
      `;
      document.head.appendChild(style);
    }


    // Create a container for UI elements.
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.position = 'absolute';
    this.uiContainer.style.top = '10px';
    this.uiContainer.style.left = '10px';
    this.uiContainer.style.color = 'white';
    this.uiContainer.style.fontFamily = 'Arial, sans-serif';
    this.uiContainer.style.fontSize = '18px';
    document.body.appendChild(this.uiContainer);

    // Create a message element.
    this.messageDiv = document.createElement('div');
    this.messageDiv.style.position = 'absolute';
    this.messageDiv.style.top = '50%';
    this.messageDiv.style.left = '50%';
    this.messageDiv.style.transform = 'translate(-50%, -50%)';
    this.messageDiv.style.padding = '10px 20px';
    this.messageDiv.style.background = 'rgba(0, 0, 0, 0.7)';
    this.messageDiv.style.color = 'white';
    this.messageDiv.style.fontSize = '24px';
    this.messageDiv.style.borderRadius = '5px';
    this.messageDiv.style.display = 'none';
    document.body.appendChild(this.messageDiv);

    // Create a container for the mana bar
    this.manaBarContainer = document.createElement("div");
    this.manaBarContainer.style.position = "absolute";
    this.manaBarContainer.style.bottom = "35px"; // Slightly above bottom HUD
    this.manaBarContainer.style.left = "50%";
    this.manaBarContainer.style.transform = "translateX(-50%)";
    this.manaBarContainer.style.width = "300px";
    this.manaBarContainer.style.height = "16px";
    this.manaBarContainer.style.border = "2px solid white";
    this.manaBarContainer.style.background = "rgba(0, 0, 0, 0.5)";
    document.body.appendChild(this.manaBarContainer);

    // Create the actual mana bar
    this.manaBar = document.createElement("div");
    this.manaBar.style.height = "100%";
    this.manaBar.style.width = "100%";
    this.manaBar.style.background = "#00BFFF"; // DeepSkyBlue
    this.manaBarContainer.appendChild(this.manaBar);

    this.manaBarContainer.style.display = 'none'; // for now, let's hide the old bottom-centre mana bar



    this.damageOverlay = document.createElement("div");
    this.damageOverlay.style.position = "absolute";
    this.damageOverlay.style.top = 0;
    this.damageOverlay.style.left = 0;
    this.damageOverlay.style.width = "100%";
    this.damageOverlay.style.height = "100%";
    this.damageOverlay.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
    this.damageOverlay.style.opacity = 0;
    this.damageOverlay.style.transition = "opacity 0.3s";
    this.damageOverlay.style.pointerEvents = "none";
    document.body.appendChild(this.damageOverlay);
    
    if (!document.getElementById('centre-hud-style')) {
      const style = document.createElement('style');
      style.id = 'centre-hud-style';
      style.textContent = `
        /* —— global HUD palette —— */
        :root{
          --hud-bg:       rgba(15,15,20,.75);
          --hud-border:   #ffffff40;
          --hp-grad:        #25c025;
          --mp-grad:      #00BFFF;
        }

        /* —— centre container —— */
        .centre-hud{
          position:absolute;
          bottom:62px; 
          left:50%; 
          translate:-50% 0;
          display:flex; 
          flex-direction:column;
          align-items:center; 
          gap:10px;
          padding:6px 10px; 
          border:1px solid var(--hud-border);
          border-radius:12px; 
          background:var(--hud-bg);
          backdrop-filter:blur(8px);            /* subtle glass */
          pointer-events:none;
          transition:opacity .3s;
        }

        /* —— avatar —— */
        .centre-hud .avatar{
          width:56px; aspect-ratio:1; position:relative;
          border-radius:50%; overflow:hidden;
          box-shadow:0 0 6px 2px #000c;
        }
        .centre-hud .avatar img{width:100%;height:100%;object-fit:cover;}

        .centre-hud .level-ring{
          position:absolute; 
          bottom:-2px; 
          right:3px;
          width:22px; 
          aspect-ratio:1; 
          border-radius:50%;
          font:12px/22px Arial,Helvetica,sans-serif; 
          text-align:center;
          color:#fff; 
          background:#191919; 
          border:1px solid #fff;
          box-shadow:0 0 4px 1px #000c inset;
        }

        /* ╭─ LEVEL RINGS ───────────────────────────────────────────╮ */
        .level-ring,
        .level-badge{                 /* <- add this class to the floating badge */
          --p:0;                      /* progress 0-100 (set in JS)              */
          position:relative;
        }
        .level-ring::before,
        .level-badge::before{
          content:'';
          position:absolute;
          inset:-3px;                 /* ring thickness */
          border-radius:50%;
          background:
            conic-gradient(#ffd700 calc(var(--p)*1%),transparent 0);
          -webkit-mask:
              radial-gradient(farthest-side,
                              transparent calc(100% - 3px),   /* inside → hole  */
                              #000       calc(100% - 3px));    /* 3 px rim stays */
                  mask:
              radial-gradient(farthest-side,
                              transparent calc(100% - 3px),
                              #000       calc(100% - 3px));

          pointer-events:none;
        }


        /* —— bar column —— */
        .centre-hud .bars{display:flex; flex-direction:column; gap:4px;}

        .centre-hud .bar-back{
          width:140px; height:12px; border:1px solid var(--hud-border);
          border-radius:6px; overflow:hidden; background:#0008;
        }
        .centre-hud .hp-fill   {height:100%; background:var(--hp-grad);}
        .centre-hud .mp-fill   {height:100%; background:var(--mp-grad);}

        /* —— spell icon —— */
        .centre-hud .horde{
          width:40px; aspect-ratio:1; object-fit:contain;
          filter:drop-shadow(0 0 4px #0008);
          transition:transform .15s;
        }
        .centre-hud .spell.low-mana{animation:pulse 1s infinite alternate;}
        @keyframes pulse{from{transform:scale(1)}to{transform:scale(.9)}}
      `;
      document.head.appendChild(style);
    }

    /* 0------------ Global CSS for the turret button (once per page) */
    if (!document.getElementById('turret-btn-style')) {
      const style = document.createElement('style');
      style.id = 'turret-btn-style';
      style.textContent = `
        .turret-btn{
          width:48px;           /* keeps hit-target the same size      */
          aspect-ratio:1;
          cursor:grab;
          transition:filter .15s,transform .1s;
          filter:drop-shadow(0 0 4px #0f0);           /* base glow      */
        }
        .turret-btn:hover  { filter:drop-shadow(0 0 8px #4f4); }        /* brighter */
        .turret-btn:active { transform:scale(.93); cursor:grabbing; }   /* tap feel */
      `;
      document.head.appendChild(style);
    }

    if (!document.getElementById('cam-btn-style')) {
      const style = document.createElement('style');
      style.id = 'cam-btn-style';
      style.textContent = `
        .cam-btn{
          width:40px;               /* square hit-target */
          aspect-ratio:1;
          cursor:pointer;
          transition:filter .15s,transform .1s;
          filter:drop-shadow(0 0 4px #0af);
        }
        .cam-btn:hover  { filter:drop-shadow(0 0 8px #4cf); }
        .cam-btn:active { transform:scale(.93); }
        /* when follow-mode is ON we’ll add the “active” class: */
        .cam-btn.active{ filter:drop-shadow(0 0 8px #0f0); }
      `;
      document.head.appendChild(style);
    }


    /* turret palette ---------------------------------------------------- */
    this.palette = document.createElement('div');
    this.palette.style.position = 'absolute';
    this.palette.style.top  = '50%';
    this.palette.style.left = '10px';
    this.palette.style.transform = 'translateY(-50%)';
    this.palette.style.display = 'flex';
    this.palette.style.flexDirection = 'column';
    this.palette.style.gap  = '12px';
    document.body.appendChild(this.palette);


    /* one button for now */
    this.turretBtn = document.createElement('img');
    this.turretBtn.src = 'assets/ui/turret.svg';   // <-- drop your SVG/PNG here
    this.turretBtn.alt = 'Place Turret';
    this.turretBtn.classList.add('ui-btn', 'turret-btn');    // picks up the CSS above
    this.palette.appendChild(this.turretBtn);

    this.turretBtn.addEventListener('pointerdown', e => {
      if (parseInt(this.turretBadge.innerText) > 0) {
        if (this.onStartTurretDrag) this.onStartTurretDrag(e);
      } else {
        /* tiny feedback if empty */
        this.turretBtn.style.transform = 'scale(.9)';
        setTimeout(()=>this.turretBtn.style.transform='',100);
      }
    });

    this.turretBadge = document.createElement('span');
    this.turretBadge.style.cssText = `
      position:absolute; right:-4px; bottom:-4px;
      background:#222; color:#0f0; font:12px/16px Arial,sans-serif;
      border:1px solid #0f0; border-radius:50%; width:20px; height:20px;
      display:flex; align-items:center; justify-content:center;
      pointer-events:none;
    `;
    this.turretBadge.innerText = '0';
    this.turretBtn.style.position = 'relative';   // anchor for badge
    this.turretBtn.appendChild(this.turretBadge);

    /* expose an updater */
    this.updateTurretCount = (n) => {
      this.turretBadge.innerText = n;
      this.turretBtn.style.opacity = n > 0 ? '1' : '0.35'; // grey-out if none
    };

    /* after you finish building turretBtn/badge … add a second palette entry */
    this.molotovBtn = document.createElement('img');
    this.molotovBtn.src  = 'assets/ui/molotov_background_2.svg';    // supply any icon
    this.molotovBtn.alt  = 'Throw Molotov';
    this.molotovBtn.classList.add('ui-btn', 'molotov-btn');       // reuse same CSS
    this.palette.appendChild(this.molotovBtn);
      
    this.molotovBadge = this.turretBadge.cloneNode();  // copy style
    this.molotovBadge.innerText = '0';
    this.molotovBtn.style.position = 'relative';
    this.molotovBtn.appendChild(this.molotovBadge);
      
    this.updateMolotovCount = n => {
      this.molotovBadge.innerText = n;
      this.molotovBtn.style.opacity = n > 0 ? '1' : '0.35';
    };
    
    /* drag-start callback hook */
    this.molotovBtn.addEventListener('pointerdown', e=>{
      if (parseInt(this.molotovBadge.innerText) > 0) {
          if (this.onStartMolotovDrag) this.onStartMolotovDrag(e);
      } else {
          this.molotovBtn.style.transform='scale(.9)';
          setTimeout(()=>this.molotovBtn.style.transform='',100);
      }
    });


    
    /* ╭──────────────── centre HUD ────────────────╮ */
    this.centerHUD = document.createElement('div');
    this.centerHUD.className = 'centre-hud';
    document.body.appendChild(this.centerHUD);

    /* ── SPELL BAR ───────────────────────── */
    const spellRow = document.createElement('div');
    spellRow.style.cssText = `
        display:flex; gap:10px; pointer-events:auto;   /* allow clicking */
    `;
    this.centerHUD.appendChild(spellRow);

    /* key overlays – one reusable helper ▶ */
    const addKeyBadge = (btn, key) => {
      const badge = document.createElement('span');
      badge.textContent = key;
      badge.style.cssText = `
          position:absolute; top:-4px; left:-4px;
          width:18px; height:18px; border-radius:50%;
          background:#000d; color:#fff; font:12px/18px Arial,sans-serif;
          border:1px solid #fff; text-align:center;
          pointer-events:none;
      `;
      btn.style.position = 'relative';
      btn.appendChild(badge);
    };

    
    /* — 1. Turret — */
    spellRow.appendChild(this.turretBtn);
    addKeyBadge(this.turretBtn, '1');

    /* — 2. Molotov — */
    spellRow.appendChild(this.molotovBtn);
    addKeyBadge(this.molotovBtn, '2');

    /* — 3-5. empty slots — */
    for (let k = 3; k <= 5; k++) {
      const placeholder = document.createElement('img');
      placeholder.src   = 'assets/ui/horde/empty.svg';   // a 48×48 grey frame
      placeholder.alt   = `Spell ${k}`;
      placeholder.classList.add('ui-btn');
      placeholder.style.opacity = '.25';
      addKeyBadge(placeholder, String(k));
      spellRow.appendChild(placeholder);
    }


    /* avatar + level */
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'avatar';
    this.centerHUD.appendChild(avatarWrap);

    this.avatarImg = document.createElement('img');
    //this.avatarImg.src = 'src/img/rad-grad.png';
    avatarWrap.appendChild(this.avatarImg);

    this.setAvatar = (src)=>{     
      this.avatarImg.src = src; 
    };


    this.levelRing = document.createElement('div');
    this.levelRing.className = 'level-ring';
    this.levelRing.textContent = '1';
    avatarWrap.appendChild(this.levelRing);

    /* bars */
    const bars = document.createElement('div');
    bars.className = 'bars';
    this.centerHUD.appendChild(bars);

    const hpBack = document.createElement('div');
    hpBack.className = 'bar-back';
    this.hpFill = document.createElement('div');
    this.hpFill.className = 'hp-fill';
    hpBack.appendChild(this.hpFill);
    bars.appendChild(hpBack);

    const mpBack = document.createElement('div');
    mpBack.className = 'bar-back';
    mpBack.style.height = '6px';                      // thinner mana bar
    this.mpFill = document.createElement('div');
    this.mpFill.className = 'mp-fill';
    mpBack.appendChild(this.mpFill);
    bars.appendChild(mpBack);

    /* horde icon, should show the wave number in Roman numbers */
    this.horde = document.createElement('img');
    this.horde.className = 'horde';
    this.horde.src = 'assets/ui/horde/empty.svg';
    this.centerHUD.appendChild(this.horde);

    /* ── map 1 → I, 2 → II … (extend if you have more waves) */
    const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];

    /** change the horde badge to the correct Roman‐numeral svg */
    this.setHordeWave = (waveNum) => {
      const r = romans[waveNum - 1] ?? waveNum;          // fallback to the number
      this.horde.src = `assets/ui/horde/horde_${r}.svg`;       // e.g. assets/ui/horde_IV.svg
    };

    /* avatar + bars row (existing code, now inside its own flex row) */
    const coreRow = document.createElement('div');
    coreRow.style.cssText = 'display:flex; align-items:center; gap:16px; pointer-events:none;';
    this.centerHUD.appendChild(coreRow);

    coreRow.appendChild(avatarWrap);
    coreRow.appendChild(bars);
    coreRow.appendChild(this.horde);

    /**
     * @param {number} hp   0-100
     * @param {number} mp   0-100
     */
    this.updateCenterHUD = (hp, mp) => {
      this.hpFill.style.width = `${Math.max(0,Math.min(hp,100))}%`;
      this.mpFill.style.width = `${Math.max(0,Math.min(mp,100))}%`;

    };



    // --- Bottom HUD ---
    this.bottomHUD = document.createElement("div");
    this.bottomHUD.style.position = "absolute";
    this.bottomHUD.style.bottom = "0";
    this.bottomHUD.style.left = "0";
    this.bottomHUD.style.width = "100%";
    this.bottomHUD.style.height = "80px";
    this.bottomHUD.style.background = "linear-gradient(to top, rgba(0,0,0,0.8), transparent)";
    this.bottomHUD.style.display = "flex";
    this.bottomHUD.style.alignItems = "center";
    this.bottomHUD.style.justifyContent = "space-between";
    this.bottomHUD.style.padding = "0 30px";
    this.bottomHUD.style.boxSizing = "border-box";
    this.bottomHUD.style.color = "white";
    this.bottomHUD.style.fontSize = "16px";
    this.bottomHUD.style.fontFamily = "Arial, sans-serif";
    document.body.appendChild(this.bottomHUD);

    // Left HUD info
    this.hudLeft = document.createElement("div");
    // this.hudLeft.innerHTML = "🔪 Left Click = Knife | 1 = Turret | 2 = Molotov";

    // Right HUD info with tip and button
    this.hudRight = document.createElement("div");
    this.hudRight.style.display = "flex";
    this.hudRight.style.alignItems = "center";
    this.hudRight.style.gap = "15px";

    const tip = document.createElement("span");

    this.cameraToggleBtn = document.createElement("img");
    this.cameraToggleBtn.src  = 'assets/ui/camera.svg';
    this.cameraToggleBtn.alt  = 'Toggle Camera Follow';
    this.cameraToggleBtn.className = 'cam-btn';
    this.hudRight.appendChild(this.cameraToggleBtn);

    /* click → delegate to game + toggle visual state */
    this.cameraToggleBtn.addEventListener('click', () => {
      this.cameraToggleBtn.classList.toggle('active');      // visual feedback
      this.onToggleCameraFollow?.();                        // call the hook
    });

    // Append HUDs
    this.bottomHUD.appendChild(this.hudLeft);
    this.bottomHUD.appendChild(this.hudRight);


    /* ───────── Floating bars above the player ───────── */
    this.playerBars = document.createElement('div');
    this.playerBars.style.cssText = `
      position:absolute;              /* we will move it every frame      */
      pointer-events:none;            /* clicks go through              */
      transform:translate(-50%,-100%);/* center & sit just above point */
      display:flex; align-items:center; gap:6px;   /* badge ─ bars row  */
    `;                                  /* (↕ centre-vertically)          */
    document.body.appendChild(this.playerBars);

    /* LEVEL BADGE (always “1” for now) */
    this.levelBadge = document.createElement('div');
    this.levelBadge.style.cssText = `
        width:22px; 
        height:22px; 
        border-radius:50%;
        background:#222; 
        border:1px solid #fff; 
        color:#fff;
        font:12px/22px Arial,sans-serif; 
        text-align:center;
    `;
    this.levelBadge.textContent = '1';
    this.levelBadge.className = 'level-badge'
    this.playerBars.appendChild(this.levelBadge);

    /* a column wrapper that will hold the two bars */
    this.barsColumn = document.createElement('div');
    this.barsColumn.style.cssText = `
        display:flex; flex-direction:column; gap:2px;
    `;
 

    /* — HEALTH — */
    this.healthBack = document.createElement('div');
    this.healthBack.style.cssText =
      'width:80px;height:8px;background:rgba(0,0,0,.6);border:1px solid #fff';
    this.healthBar = document.createElement('div');
    this.healthBar.style.cssText =
      'height:100%;width:100%;background:#25c025';     /* green */
    this.healthBack.appendChild(this.healthBar);
    this.barsColumn.appendChild(this.healthBack);

    /* — MANA — */
    this.manaBack = document.createElement('div');
    this.manaBack.style.cssText =
      'width:80px;height:2px;margin-top:1px;background:rgba(0,0,0,.6);border:1px solid #fff';
    this.manaBar  = document.createElement('div');
    this.manaBar.style.cssText =
      'height:100%;width:100%;background:#00BFFF';     /* blue */
    this.manaBack.appendChild(this.manaBar);
    this.barsColumn.appendChild(this.manaBack);
    this.playerBars.appendChild(this.barsColumn);


    /* ╭─ full-screen fade & game-over panel ──────────────────────────────╮ */
    this.fadeLayer = document.createElement('div');
    this.fadeLayer.style.cssText = `
      position:fixed; inset:0; background:#000; opacity:0;
      transition:opacity 1.5s ease;  z-index:999; pointer-events:none;
    `;
    document.body.appendChild(this.fadeLayer);

    /* translucent dimmer: just reuse the existing layer with lower opacity */
    this.dimStage = ()=>{
      this.fadeLayer.style.transition = 'opacity .6s ease';
      this.fadeLayer.style.opacity = .45;      // ≈ 55 % darker
    };

    this.gameOverPanel = document.createElement('div');
    this.gameOverPanel.style.cssText = `
      position:fixed; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      font:48px/1.2 'Impact',sans-serif; color:#fff;
      text-align:center; opacity:0; transition:opacity .8s ease .2s;
      z-index:1000; pointer-events:none;
    `;
    document.body.appendChild(this.gameOverPanel);

    /* helpers ---------------------------------------------------------------- */
    this.fadeToBlack = (cb)=>{
      this.fadeLayer.style.opacity = 1;
      this.fadeLayer.addEventListener('transitionend', cb, { once:true });
    };

    this.showGameOver = (wave,timeStr)=>{
      this.gameOverPanel.innerHTML = `
        <div style="font-size:72px;margin-bottom:.3em">💀 Game Over 💀</div>
        <div style="font-size:32px">Wave ${wave}</div>
        <div style="font-size:32px;margin-bottom:.6em">${timeStr}</div>
        <div style="font-size:18px;opacity:.7">Press R to restart</div>`;
      this.gameOverPanel.style.opacity = 1;
    };


    this.updateLevelRing?.(1,0); // to make the HUD start at level 1 / 0%
  }

  

  /**
   * @param {number} level         – 1,2,3…
   * @param {number} xpPct         – 0-100
   */
  updateLevelRing(level, xpPct){
    this.levelRing.textContent  = level;
    this.levelBadge.textContent = level;
    /* tweak 0-100 to fit the CSS custom property */
    this.levelRing .style.setProperty('--p', xpPct);
    this.levelBadge.style.setProperty('--p', xpPct);
  }


  showFloatingMessage(text, worldPosition) {
    const message = document.createElement("div");
    message.innerText = text;
    message.style.position = "absolute";
    message.style.color = "white";
    message.style.fontSize = "16px";
    message.style.pointerEvents = "none";
    message.style.transition = "transform 1s ease-out, opacity 1s ease-out";
    message.style.opacity = "1";
    message.style.fontFamily = "Arial, sans-serif";
  
    // Customize for BULLET HELL emphasis
    if (text.includes("BULLET HELL")) {
      message.style.fontSize = "32px";
      message.style.color = "red";
      message.style.fontWeight = "bold";
      message.style.textShadow = "2px 2px 4px black";
    } else {
      message.style.fontSize = "16px";
      message.style.color = "white";
    }

    document.body.appendChild(message);
  
    // Convert world coordinates to screen coordinates
    const screenPos = this.worldToScreen(worldPosition);
    message.style.left = `${screenPos.x}px`;
    message.style.top = `${screenPos.y}px`;
  
    // Animate upward and fade
    setTimeout(() => {
      message.style.transform = "translateY(-40px)";
      message.style.opacity = "0";
    }, 50);
  
    // Remove after animation
    setTimeout(() => {
      document.body.removeChild(message);
    }, 1000);
  }  


  worldToScreen(worldPosition) {
    const width = window.innerWidth;
    const height = window.innerHeight;
  
    // Assume camera and renderer are globally accessible or passed in
    const vector = worldPosition.clone().project(this.camera);
  
    return {
      x: (vector.x + 1) * 0.5 * width,
      y: (-vector.y + 1) * 0.5 * height
    };
  }  

  updateBottomHUD(leftText, rightText) {
    this.hudLeft.innerHTML = leftText;
    this.hudRight.innerHTML = rightText;
  }

  update(wave = null) {
    if (wave != null) {
      if (wave < 1) {
        this.setHordeWave(1);
      } else {
        this.setHordeWave(wave);
      }
    }
  }

  showMessage(text, duration = 3) {
    this.messageDiv.innerText = text;
    this.messageDiv.style.display = 'block';
    setTimeout(() => {
      this.messageDiv.style.display = 'none';
    }, duration * 1000);
  }

  updatePowerupBar(percentage, label = "") {
    this.powerupBar.style.width = percentage + "%";
    this.powerupLabel.innerText = label;
    if (percentage > 0) {
      this.powerupBarContainer.style.display = "block";
      this.powerupLabel.style.display = "block";
    } else {
      this.powerupBar.style.width = "100%";
      this.powerupLabel.innerText = "No Powerups Active";
      this.powerupLabel.style.display = "block";
    }
  }

  updateManaBar(percentage) {
    this.manaBar.style.width = `${Math.max(0, Math.min(percentage, 100))}%`;

    // Optionally change color based on level
    if (percentage > 50) {
      this.manaBar.style.background = "#00BFFF"; // Normal (DeepSkyBlue)
    } else if (percentage > 20) {
      this.manaBar.style.background = "#FFD700"; // Warning (Gold)
    } else {
      this.manaBar.style.background = "#FF4500"; // Low (OrangeRed)
    }
  }

  
  /**
   * Re-positions the bar group over `worldPos`
   * and updates fill levels.
   * @param {THREE.Vector3} worldPos – point above the player’s head
   * @param {number} healthPct        – 0-100
   * @param {number} manaPct          – 0-100
   */
  updatePlayerBars(worldPos, healthPct, manaPct) {
    if (!this.camera) return;
    const p = this.worldToScreen(worldPos);
    this.playerBars.style.left = `${p.x}px`;
    this.playerBars.style.top  = `${p.y}px`;
    this.healthBar.style.width = `${Math.max(0, Math.min(healthPct,100))}%`;
    this.manaBar .style.width  = `${Math.max(0, Math.min(manaPct ,100))}%`;
  };

  flashDamageOverlay() {
    this.damageOverlay.style.opacity = 1;
    setTimeout(() => {
      this.damageOverlay.style.opacity = 0;
    }, 100);
  }
  
}