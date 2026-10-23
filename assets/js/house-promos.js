// Clicks on House marks units. Sent only through the gtag already on the page,
// so consent mode still applies. No separate tag is loaded.
(function () {
  document.addEventListener("click", function (event) {
    var node = event.target;
    if (!node || typeof node.closest !== "function") return;
    var link = node.closest("a[data-promo-slot]");
    if (!link || typeof window.gtag !== "function") return;
    window.gtag("event", "promo_click", {
      slot: link.getAttribute("data-promo-slot") || "",
      target: link.getAttribute("data-promo-target") || "",
      transport_type: "beacon",
    });
  });
})();
