document.addEventListener("DOMContentLoaded", function() {
  const isMobile = window.innerWidth < 768; // adjust breakpoint as needed
  const initialOffset = isMobile ? "100%" : "-100%";

  ScrollTrigger.create({
    trigger: ".hero-button.cta-button",
    start: "bottom top",
    markers: false,
    onEnter: () => {
      gsap.fromTo(
        ".persistent-cta",
        { y: initialOffset, opacity: 0 },
        { y: "0%", opacity: 1, duration: 0.5, ease: "power1.out" }
      );
    },
    onLeaveBack: () => {
      gsap.fromTo(
        ".persistent-cta",
        { y: "0%", opacity: 1 },
        { y: initialOffset, opacity: 0, duration: 0.5, ease: "power1.out" }
      );
    }
  });
});
