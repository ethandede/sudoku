document.addEventListener("DOMContentLoaded", function() {
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  portfolioItems.forEach(function(item) {
    const arrow = item.querySelector('.portfolio-arrow i');

    item.addEventListener('mouseenter', function() {
      gsap.to(arrow, {
        duration: 0.5,
        x: 35,
        ease: "power1.out"
      });
    });
    
    item.addEventListener('mouseleave', function() {
      gsap.to(arrow, {
        duration: 0.3,
        x: 0,
        ease: "bounce.out"
      });
    });
  });
});
