document.addEventListener("DOMContentLoaded", () => {
  const lists = Array.from(document.querySelectorAll(".pill-list[data-collapsible='true']"));
  if (!lists.length) return;

  lists.forEach((list) => {
    const wrap = list.querySelector(".pill-wrap");
    const btn = list.querySelector("[data-pill-toggle]");
    if (!wrap || !btn) return;
    if (btn.dataset.bound === "1") return;

    const maxCollapsed = Number.parseInt(list.getAttribute("data-max") || "4", 10);
    const pills = Array.from(wrap.querySelectorAll(".sn-pill"));
    const count = pills.length;

    if (count <= maxCollapsed) {
      btn.style.display = "none";
      list.removeAttribute("data-expanded");
      return;
    }

    const labelCollapsed = `Show all (${count})`;
    const labelExpanded = "Show less";
    btn.textContent = labelCollapsed;

    btn.addEventListener("click", () => {
      const expanded = list.getAttribute("data-expanded") === "true";
      if (expanded) list.removeAttribute("data-expanded");
      else list.setAttribute("data-expanded", "true");
      btn.textContent = expanded ? labelCollapsed : labelExpanded;
    });

    btn.dataset.bound = "1";
  });
});
