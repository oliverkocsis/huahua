(function initHuahuaApp() {
  const speedButtons = Array.from(document.querySelectorAll(".speed-button"));
  const appState = { speed: 1 };

  function setSpeed(nextSpeed) {
    if (!Number.isFinite(nextSpeed)) return;
    appState.speed = nextSpeed;

    for (const button of speedButtons) {
      const isActive = Number(button.dataset.speed) === nextSpeed;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  }

  for (const button of speedButtons) {
    button.addEventListener("click", () => {
      setSpeed(Number(button.dataset.speed));
    });
  }

  window.HUAHUA_APP = appState;
  setSpeed(appState.speed);
})();
