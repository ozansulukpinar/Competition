// admin-dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".admin-buttons button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const link = btn.getAttribute("data-link");
      if (link) window.location.href = link;
    });
  });
});
