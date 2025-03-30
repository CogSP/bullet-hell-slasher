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
    }
  
    update(health, score) {
      this.uiContainer.innerHTML = `Health: ${health} <br> Score: ${score}`;
    }
  }
  