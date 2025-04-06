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

    // Create a camera toggle button.
    this.cameraToggleButton = document.createElement('button');
    this.cameraToggleButton.innerText = "Toggle Camera Follow";
    this.cameraToggleButton.style.position = 'absolute';
    this.cameraToggleButton.style.bottom = '20px';
    this.cameraToggleButton.style.right = '20px';
    this.cameraToggleButton.style.padding = '10px 15px';
    document.body.appendChild(this.cameraToggleButton);

    // When the button is clicked, call the callback if provided.
    this.cameraToggleButton.addEventListener('click', () => {
      if (this.onToggleCameraFollow) {
        this.onToggleCameraFollow();
      }
    });

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
    this.powerupBarContainer.style.display = "none"; // Hidden if no powerup is active.
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
    // Update the width of the bar (0-100%).
    this.powerupBar.style.width = percentage + "%";
    // Update the label.
    this.powerupLabel.innerText = label;
    // Show or hide the bar based on whether a powerup is active.
    if (percentage > 0) {
      this.powerupBarContainer.style.display = "block";
      this.powerupLabel.style.display = "block";
    } else {
      this.powerupBarContainer.style.display = "none";
      this.powerupLabel.style.display = "none";
    }
  }
}
