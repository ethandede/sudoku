document.addEventListener("DOMContentLoaded", function() {
  // Ensure ScrollTrigger is registered if needed
  gsap.registerPlugin(ScrollTrigger);

  gsap.from(".hero h1, .hero h2, .hero h6", {
    duration: 1.5,
    y: -50,
    opacity: 0,
    ease: "power4.out",
    stagger: 0.2
  });
});
