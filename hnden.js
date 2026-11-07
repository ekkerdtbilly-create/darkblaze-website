
(() => {
  const visual = document.querySelector("#hnden-visual");
  const toggle = document.querySelector("#hnden-motion-toggle");
  const status = document.querySelector("#hnden-motion-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;
  if (!visual || !toggle || !status) return;

  let shouldResume = false;

  function setPlaybackState(playing, message) {
    toggle.textContent = playing ? "Pause visual" : "Play visual";
    toggle.setAttribute("aria-pressed", String(playing));
    status.textContent = message;
  }

  function loadVisualWhenRequested() {
    const source = visual.querySelector("source[data-src]");
    if (!source || source.hasAttribute("src")) return;
    source.src = source.dataset.src;
    visual.load();
  }

  async function playVisual(message = "The visual is moving.") {
    try {
      loadVisualWhenRequested();
      await visual.play();
      setPlaybackState(true, message);
      return true;
    } catch {
      setPlaybackState(false, "The visual could not start. You can try again with Play visual.");
      return false;
    }
  }

  function pauseVisual(message = "The visual is paused.") {
    visual.pause();
    setPlaybackState(false, message);
  }

  toggle.addEventListener("click", () => {
    if (visual.paused) void playVisual();
    else pauseVisual();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      shouldResume = !visual.paused;
      if (shouldResume) pauseVisual("Paused while this page is hidden.");
      return;
    }
    if (shouldResume && !reducedMotion.matches) {
      shouldResume = false;
      void playVisual();
    }
  });

  reducedMotion.addEventListener("change", (event) => {
    if (event.matches && !visual.paused) {
      shouldResume = false;
      pauseVisual("Paused because reduced motion is enabled.");
    }
  });

  if (reducedMotion.matches) {
    pauseVisual("Paused because reduced motion is enabled.");
  } else if (saveData) {
    pauseVisual("Paused to respect the browser's data-saving preference. Press Play to load the visual.");
  } else {
    void playVisual();
  }
})();



