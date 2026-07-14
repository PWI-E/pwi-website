(function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function bindHandoff(form, input, source) {
    if (!form || !input || form.dataset.nlHandoff === "1") return;
    form.dataset.nlHandoff = "1";
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var raw = String(input.value || "").trim();
      if (!raw || !EMAIL_RE.test(raw)) {
        if (typeof form.reportValidity === "function") {
          form.reportValidity();
        } else {
          input.setCustomValidity("Please enter a valid email address.");
          input.reportValidity();
          input.setCustomValidity("");
        }
        input.focus();
        return;
      }
      try {
        sessionStorage.setItem("pwi_newsletter_email", raw);
        sessionStorage.setItem("pwi_newsletter_from", source);
      } catch (e) {}
      window.location.href = "newsletter-signup.html";
    });
  }

  function init() {
    bindHandoff(
      document.getElementById("homepage-newsletter-form"),
      document.getElementById("homepage-newsletter-email"),
      "homepage"
    );
    document.querySelectorAll(".pwi-footer-nl-form").forEach(function (form) {
      bindHandoff(form, form.querySelector('input[type="email"]'), "footer");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
