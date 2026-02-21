(function initHuahuaApp() {
  const speedControl = document.querySelector(".speed-control");
  const speedCurrentButton = document.querySelector(".speed-current");
  const speedButtons = Array.from(document.querySelectorAll(".speed-button"));
  const creditContainer = document.querySelector(".main-credit");
  const titleElement = document.querySelector(".credit-title");
  const authorElement = document.querySelector(".credit-author");
  const urlElement = document.querySelector(".credit-url");
  const appState = { speed: 1 };
  const mobileSpeedQuery = window.matchMedia("(max-width: 720px)");

  function isCollapsibleSpeedControl() {
    return mobileSpeedQuery.matches;
  }

  function setSpeedMenuOpen(nextOpen) {
    if (!speedControl || !speedCurrentButton) return;
    const open = isCollapsibleSpeedControl() ? Boolean(nextOpen) : false;
    speedControl.classList.toggle("is-open", open);
    speedCurrentButton.setAttribute("aria-expanded", String(open));
  }

  function setSpeed(nextSpeed, collapseAfterSelection) {
    if (!Number.isFinite(nextSpeed)) return;
    appState.speed = nextSpeed;

    for (const button of speedButtons) {
      const isActive = Number(button.dataset.speed) === nextSpeed;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }

    if (speedCurrentButton) speedCurrentButton.textContent = `${nextSpeed}x`;
    if (collapseAfterSelection) setSpeedMenuOpen(false);
  }

  for (const button of speedButtons) {
    button.addEventListener("click", () => {
      setSpeed(Number(button.dataset.speed), true);
    });
  }

  if (speedCurrentButton) {
    speedCurrentButton.addEventListener("click", () => {
      if (!isCollapsibleSpeedControl()) return;
      setSpeedMenuOpen(!speedControl.classList.contains("is-open"));
    });
  }

  document.addEventListener("click", (event) => {
    if (!isCollapsibleSpeedControl()) return;
    if (!speedControl || speedControl.contains(event.target)) return;
    setSpeedMenuOpen(false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setSpeedMenuOpen(false);
  });

  mobileSpeedQuery.addEventListener("change", () => {
    setSpeedMenuOpen(false);
  });

  function toDisplayUrl(sourceUrl, maxLength) {
    const cleaned = sourceUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    if (cleaned.length <= maxLength) return cleaned;
    return `${cleaned.slice(0, maxLength - 3)}...`;
  }

  function setCredits(title, author, sourceUrl) {
    if (titleElement) titleElement.textContent = title || "Now Drawing";
    if (authorElement) authorElement.textContent = author || "@unknown";
    if (!urlElement) return;

    if (!sourceUrl) {
      urlElement.textContent = "";
      urlElement.removeAttribute("href");
      return;
    }

    urlElement.textContent = toDisplayUrl(sourceUrl, 40);
    urlElement.href = sourceUrl;
  }

  window.HUAHUA_APP = appState;
  appState.setCredits = (creditsOrTitle, author, sourceUrl) => {
    if (typeof creditsOrTitle === "object" && creditsOrTitle !== null) {
      setCredits(creditsOrTitle.title || "", creditsOrTitle.author || "", creditsOrTitle.url || "");
      return;
    }
    setCredits(creditsOrTitle || "", author || "", sourceUrl || "");
  };

  if (creditContainer) {
    appState.setCredits(
      creditContainer.dataset.title || "",
      creditContainer.dataset.author || "",
      creditContainer.dataset.url || "",
    );
  }

  if (window.HUAHUA_PENDING_CREDITS) {
    appState.setCredits(window.HUAHUA_PENDING_CREDITS);
    window.HUAHUA_PENDING_CREDITS = null;
  }

  setSpeed(appState.speed, false);
  setSpeedMenuOpen(false);
})();
