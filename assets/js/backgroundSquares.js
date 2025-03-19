document.addEventListener("DOMContentLoaded", function() {
  console.log("backgroundSquares.js loaded");

  // Helper function to convert hex to RGB
  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(function (h) {
        return h + h;
      }).join('');
    }
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  // Define default colors (from your Sass variables)
  const defaultAccentColor = '#45748C';
  const defaultHighlightColor = '#BF3978';
  const defaultAccentColorLight = lightenColor(defaultAccentColor, 10); // Lightened by 10%

  // Get references to the inputs and button
  const accentInput = document.getElementById('accentColor');
  const highlightInput = document.getElementById('highlightColor');
  const resetButton = document.getElementById('resetColors');

  if (accentInput) {
    accentInput.addEventListener('input', function() {
      const newAccent = this.value;
      // Update hex value
      document.documentElement.style.setProperty('--accent-color', newAccent);
      // Update rgb value based on the new hex
      const newRgb = hexToRgbString(newAccent);
      document.documentElement.style.setProperty('--accent-color-rgb', newRgb);
      // Also update squares or any other elements as needed
      updateSquaresColor();
    });
  } else {
    console.log("Accent input not found.");
  }

  if (highlightInput) {
    highlightInput.addEventListener('input', function() {
      const newHighlight = this.value;
      document.documentElement.style.setProperty('--highlight-color', newHighlight);
      const newHighlightRgb = hexToRgbString(newHighlight);
      document.documentElement.style.setProperty('--highlight-color-rgb', newHighlightRgb);
      // Update any elements that use the highlight color if needed.
    });
  }
  
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      console.log("Resetting colors to default.");
      document.documentElement.style.setProperty('--accent-color', defaultAccentColor);
      document.documentElement.style.setProperty('--highlight-color', defaultHighlightColor);
      document.documentElement.style.setProperty('--accent-color-light', defaultAccentColorLight);
      if (accentInput) {
        accentInput.value = defaultAccentColor;
      }
      if (highlightInput) {
        highlightInput.value = defaultHighlightColor;
      }
      updateSquaresColor();
    });
  }

  // Retrieve the current accent color from the CSS variable and convert it to RGB
  const accentHex = getComputedStyle(document.documentElement)
                      .getPropertyValue('--accent-color').trim();
  const accentRGB = hexToRgb(accentHex);

  // Select the SVG element that contains the animated squares
  const svg = document.querySelector('.animated-squares');
  const numSquares = 15;
  const svgWidth = 1920;
  const svgHeight = 1080;
  let allowedPercentage = window.innerHeight > window.innerWidth ? 0.9 : 0.75;
  const allowedHeight = svgHeight * allowedPercentage;

  // Loop to create and animate each square
  for (let i = 0; i < numSquares; i++) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    const size = (Math.floor(Math.random() * 180) + 90) * 2;
    const posX = Math.random() * (svgWidth - size);
    const maxPosY = allowedHeight - size;
    const posY = maxPosY > 0 ? Math.random() * maxPosY : 0;
    
    rect.setAttribute("x", posX);
    rect.setAttribute("y", posY);
    rect.setAttribute("width", size);
    rect.setAttribute("height", size);
    
    // Create a subtle variation around the accent color.
    const variation = 50;
    const r = Math.max(0, Math.min(255, accentRGB.r + Math.floor((Math.random() - 0.5) * variation)));
    const g = Math.max(0, Math.min(255, accentRGB.g + Math.floor((Math.random() - 0.5) * variation)));
    const b = Math.max(0, Math.min(255, accentRGB.b + Math.floor((Math.random() - 0.5) * variation)));
    const alpha = 0.1;
    rect.setAttribute("fill", `rgba(${r}, ${g}, ${b}, ${alpha})`);
    svg.appendChild(rect);
    
    const shiftX = (Math.random() - 0.5) * 3500;
    const shiftY = (Math.random() - 0.5) * 350;
    const duration = Math.random() * 60 + 30;
    
    gsap.to(rect, {
      duration: duration,
      x: shiftX,
      y: shiftY,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }

  // Function to update the fill colors of the squares based on the current accent color
  function updateSquaresColor() {
    const accentHex = getComputedStyle(document.documentElement)
                        .getPropertyValue('--accent-color').trim();
    console.log('New accent color:', accentHex);
    const accentRGB = hexToRgb(accentHex);
    const variation = 50;
  
    document.querySelectorAll('.animated-squares rect').forEach(rect => {
      const r = Math.max(0, Math.min(255, accentRGB.r + Math.floor((Math.random() - 0.5) * variation)));
      const g = Math.max(0, Math.min(255, accentRGB.g + Math.floor((Math.random() - 0.5) * variation)));
      const b = Math.max(0, Math.min(255, accentRGB.b + Math.floor((Math.random() - 0.5) * variation)));
      rect.setAttribute("fill", `rgba(${r}, ${g}, ${b}, 0.1)`);
      console.log('Updated square fill:', rect.getAttribute("fill"));
    });
  }
});
