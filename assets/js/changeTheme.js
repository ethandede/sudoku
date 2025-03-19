document.addEventListener("DOMContentLoaded", function() {
  const accentInput = document.getElementById('accentColor');
  const highlightInput = document.getElementById('highlightColor');

  if (accentInput) {
    accentInput.addEventListener('input', function() {
      console.log("Accent color changed to:", this.value);
      document.documentElement.style.setProperty('--accent-color', this.value);
      updateSquaresColor();
    });
  }

  if (highlightInput) {
    highlightInput.addEventListener('input', function() {
      document.documentElement.style.setProperty('--highlight-color', this.value);
    });
  }
});
