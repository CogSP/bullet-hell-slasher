export class UI {
  constructor() {
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

    // Create a container for the powerup bar.
    this.powerupBarContainer = document.createElement("div");
    this.powerupBarContainer.style.position = "absolute";
    this.powerupBarContainer.style.bottom = "60px";
    this.powerupBarContainer.style.left = "50%";
    this.powerupBarContainer.style.transform = "translateX(-50%)";
    this.powerupBarContainer.style.width = "300px";
    this.powerupBarContainer.style.height = "20px";
    this.powerupBarContainer.style.border = "2px solid white";
    this.powerupBarContainer.style.background = "rgba(0, 0, 0, 0.5)";
    this.powerupBarContainer.style.display = "none";
    document.body.appendChild(this.powerupBarContainer);

    // Create the actual powerup bar.
    this.powerupBar = document.createElement("div");
    this.powerupBar.style.height = "100%";
    this.powerupBar.style.width = "0%";
    this.powerupBar.style.background = "lime";
    this.powerupBarContainer.appendChild(this.powerupBar);

    // Create a label to show the powerup name.
    this.powerupLabel = document.createElement("div");
    this.powerupLabel.style.position = "absolute";
    this.powerupLabel.style.bottom = "85px";
    this.powerupLabel.style.left = "50%";
    this.powerupLabel.style.transform = "translateX(-50%)";
    this.powerupLabel.style.color = "white";
    this.powerupLabel.style.fontSize = "20px";
    this.powerupLabel.style.display = "none";
    document.body.appendChild(this.powerupLabel);

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
    this.hudLeft.innerHTML = "🔪 Knife | 💥 Dummy";

    // Right HUD info with tip and button
    this.hudRight = document.createElement("div");
    this.hudRight.style.display = "flex";
    this.hudRight.style.alignItems = "center";
    this.hudRight.style.gap = "15px";

    const tip = document.createElement("span");
    tip.innerText = "💬 Press K to slash!";

    this.cameraToggleButton = document.createElement("button");
    this.cameraToggleButton.innerText = "Toggle Camera Follow";
    this.cameraToggleButton.style.padding = "6px 12px";
    this.cameraToggleButton.style.background = "#222";
    this.cameraToggleButton.style.color = "white";
    this.cameraToggleButton.style.border = "1px solid white";
    this.cameraToggleButton.style.cursor = "pointer";

    // Append to right HUD
    this.hudRight.appendChild(tip);
    this.hudRight.appendChild(this.cameraToggleButton);

    // Append HUDs
    this.bottomHUD.appendChild(this.hudLeft);
    this.bottomHUD.appendChild(this.hudRight);

    // Correct position for adding the event listener
    this.cameraToggleButton.addEventListener("click", () => {
      if (this.onToggleCameraFollow) {
        this.onToggleCameraFollow();
      }
    });
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

  update(health, score, wave = null) {
    this.uiContainer.innerHTML = `Health: ${health} <br> Score: ${score}` +
      (wave ? `<br>Wave: ${wave}` : "");
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
}
