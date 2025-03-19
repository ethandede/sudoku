window.addEventListener("load", function() {
  const track = document.querySelector('.logo-track');
  const speed = 1; // pixels per frame; adjust for desired speed
  let offset = 0;
  
  // Clone the current logos and append them to the track.
  // This creates a duplicate set so that when we loop back,
  // the animation is seamless.
  track.innerHTML += track.innerHTML;
  
  // Calculate the total width of the original logos (first half only).
  const logos = Array.from(track.children).slice(0, track.children.length / 2);
  let totalLogoWidth = 0;
  logos.forEach(logo => {
    const logoWidth = logo.offsetWidth;
    const style = window.getComputedStyle(logo);
    const marginLeft = parseFloat(style.marginLeft);
    const marginRight = parseFloat(style.marginRight);
    totalLogoWidth += logoWidth + marginLeft + marginRight;
  });
  
  function animate() {
    offset += speed;
    // Reset the offset using modulus arithmetic so that it loops seamlessly
    const modOffset = offset % totalLogoWidth;
    track.style.transform = `translateX(-${modOffset}px)`;
    
    requestAnimationFrame(animate);
  }
  
  animate();
});
