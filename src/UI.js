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
  }

  update(health, score) {
    this.uiContainer.innerHTML = `Health: ${health} <br> Score: ${score}`;
  }

  showMessage(text, duration = 3) {
    this.messageDiv.innerText = text;
    this.messageDiv.style.display = 'block';
    setTimeout(() => {
      this.messageDiv.style.display = 'none';
    }, duration * 1000);
  }
}
