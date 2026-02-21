(function initHuahuaApp() {
  const SKETCHES = [
    { id: "mondriaan", label: "Mondriaan", script: "./mondriaan/sketch.js", pageTitle: "Huahua Mondriaan" },
    { id: "pebbles", label: "Pebbles", script: "./pebbles/sketch.js", pageTitle: "Huahua Pebbles" },
  ];
  const DEFAULT_SKETCH_ID = "mondriaan";
  const speedControl = document.querySelector(".speed-control");
  const speedCurrentButton = document.querySelector(".speed-current");
  const speedButtons = Array.from(document.querySelectorAll(".speed-button"));
  const sketchSelect = document.querySelector(".sketch-select");
  const creditContainer = document.querySelector(".main-credit");
  const titleElement = document.querySelector(".credit-title");
  const authorElement = document.querySelector(".credit-author");
  const urlElement = document.querySelector(".credit-url");
  const appState = { speed: 1, sketch: DEFAULT_SKETCH_ID };
  const mobileSpeedQuery = window.matchMedia("(max-width: 720px)");
  const activeSketch = getSketchFromUrl();

  appState.sketch = activeSketch.id;
  document.title = activeSketch.pageTitle;
  populateSketchSelect(activeSketch.id);

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

  if (sketchSelect) {
    sketchSelect.addEventListener("change", () => {
      const nextSketch = getSketchById(sketchSelect.value);
      if (!nextSketch || nextSketch.id === appState.sketch) return;
      navigateToSketch(nextSketch.id);
    });
  }

  function getSketchById(id) {
    if (!id) return null;
    for (const sketch of SKETCHES) {
      if (sketch.id === id) return sketch;
    }
    return null;
  }

  function getSketchFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return getSketchById(params.get("sketch")) || getSketchById(DEFAULT_SKETCH_ID);
  }

  function populateSketchSelect(activeSketchId) {
    if (!sketchSelect) return;
    sketchSelect.innerHTML = "";

    for (const sketch of SKETCHES) {
      const option = document.createElement("option");
      option.value = sketch.id;
      option.textContent = sketch.label;
      sketchSelect.append(option);
    }

    sketchSelect.value = activeSketchId;
  }

  function navigateToSketch(sketchId) {
    const nextUrl = new URL(window.location.href);
    if (sketchId === DEFAULT_SKETCH_ID) {
      nextUrl.searchParams.delete("sketch");
    } else {
      nextUrl.searchParams.set("sketch", sketchId);
    }
    window.location.href = nextUrl.toString();
  }

  function loadSketchScript(sketch) {
    const script = document.createElement("script");
    script.src = sketch.script;
    script.dataset.huahuaSketch = sketch.id;
    document.body.appendChild(script);
  }

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
  loadSketchScript(activeSketch);
})();
