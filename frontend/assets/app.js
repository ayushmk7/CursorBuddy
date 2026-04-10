(function () {
  const root = document.body;
  const editorStage = document.querySelector("[data-editor-stage]");
  const pointer = document.querySelector("[data-pointer]");
  const overlay = document.querySelector("[data-overlay-capsule]");
  const overlayLabel = document.querySelector("[data-overlay-label]");
  const overlayText = document.querySelector("[data-overlay-text]");
  const statusPill = document.querySelector("[data-status-pill]");
  const pttLabel = document.querySelector("[data-ptt-label]");
  const meterMode = document.querySelector("[data-meter-mode]");
  const assistantCopy = document.querySelector("[data-assistant-copy]");
  const safetyMode = document.querySelector("[data-safety-mode]");
  const safetyCopy = document.querySelector("[data-safety-copy]");
  const confirmActions = document.querySelector("[data-confirm-actions]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const copyByStatus = {
    live: {
      overlayLabel: "Listening",
      overlayText: "Opening Source Control so you can commit with context.",
      assistant:
        "Opening Source Control and highlighting the commit flow. I will ask before anything mutates Git state.",
      safetyMode: "Read-only",
      safety:
        "No confirmation needed yet. The current turn is showing where the action lives without mutating anything.",
      meterMode: "live stream",
    },
    degraded: {
      overlayLabel: "Degraded",
      overlayText: "OpenClaw is available, but this turn is running in a slower fallback mode.",
      assistant:
        "I can still guide you, but this session is degraded. Expect slower responses while I keep the flow local.",
      safetyMode: "Fallback",
      safety:
        "The runtime is degraded, so the UI stays cautious and transparent about what it can do right now.",
      meterMode: "fallback mode",
    },
    blocked: {
      overlayLabel: "Blocked",
      overlayText: "Session blocked. Check your OpenClaw connection or token, then retry locally.",
      assistant:
        "I cannot start a live turn because the local runtime cannot reach OpenClaw. Fix the connection before proceeding.",
      safetyMode: "Blocked",
      safety:
        "No actions will run while the session is blocked. The frontend should explain the problem instead of pretending the tool is live.",
      meterMode: "input paused",
    },
  };

  function setTheme(theme) {
    root.classList.remove("theme-dark", "theme-light", "theme-hc");
    root.classList.add(`theme-${theme}`);
    document.querySelectorAll("[data-theme]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.theme === theme);
    });
  }

  function setStatus(status) {
    root.dataset.status = status;
    const copy = copyByStatus[status];
    statusPill.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    overlayLabel.textContent = copy.overlayLabel;
    overlayText.textContent = copy.overlayText;
    assistantCopy.textContent = copy.assistant;
    safetyMode.textContent = copy.safetyMode;
    meterMode.textContent = copy.meterMode;
    safetyCopy.innerHTML = `<p>${copy.safety}</p>`;

    document.querySelectorAll("[data-status-toggle]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.statusToggle === status);
    });
  }

  function setListening(isListening) {
    root.dataset.listening = isListening ? "on" : "off";
    pttLabel.textContent = isListening ? "Listening" : "Idle";
    const toggle = document.querySelector('[data-toggle="listening"]');
    if (toggle) {
      toggle.classList.toggle("is-active", isListening);
    }
    const pttButton = document.querySelector("[data-ptt-button]");
    if (pttButton) {
      pttButton.setAttribute("aria-pressed", isListening ? "true" : "false");
    }
  }

  function setOverlay(isVisible) {
    root.dataset.overlay = isVisible ? "on" : "off";
    const toggle = document.querySelector('[data-toggle="overlay"]');
    if (toggle) {
      toggle.classList.toggle("is-active", isVisible);
    }
  }

  function setConfirm(isVisible) {
    root.dataset.confirm = isVisible ? "on" : "off";
    const toggle = document.querySelector('[data-toggle="confirm"]');
    if (toggle) {
      toggle.classList.toggle("is-active", isVisible);
    }
    if (confirmActions) {
      confirmActions.hidden = !isVisible;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function positionOverlay(clientX, clientY) {
    if (!editorStage || !pointer || !overlay) {
      return;
    }

    const rect = editorStage.getBoundingClientRect();
    const localX = clamp(clientX - rect.left, 18, rect.width - 18);
    const localY = clamp(clientY - rect.top, 18, rect.height - 18);

    pointer.style.left = `${localX}px`;
    pointer.style.top = `${localY}px`;

    const overlayWidth = overlay.offsetWidth || 280;
    const overlayHeight = overlay.offsetHeight || 112;
    let overlayX = localX + 24;
    let overlayY = localY + 16;

    if (overlayX + overlayWidth > rect.width - 12) {
      overlayX = localX - overlayWidth - 24;
    }

    if (overlayY + overlayHeight > rect.height - 12) {
      overlayY = localY - overlayHeight - 18;
    }

    overlay.style.left = `${clamp(overlayX, 12, rect.width - overlayWidth - 12)}px`;
    overlay.style.top = `${clamp(overlayY, 12, rect.height - overlayHeight - 12)}px`;
  }

  let rafId = 0;
  function schedulePosition(event) {
    if (prefersReducedMotion) {
      positionOverlay(event.clientX, event.clientY);
      return;
    }

    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }

    rafId = window.requestAnimationFrame(() => {
      positionOverlay(event.clientX, event.clientY);
      rafId = 0;
    });
  }

  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.theme));
  });

  document.querySelectorAll("[data-status-toggle]").forEach((button) => {
    button.addEventListener("click", () => setStatus(button.dataset.statusToggle));
  });

  document.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.toggle;
      if (type === "listening") {
        setListening(root.dataset.listening !== "on");
      } else if (type === "overlay") {
        setOverlay(root.dataset.overlay !== "on");
      } else if (type === "confirm") {
        setConfirm(root.dataset.confirm !== "on");
      }
    });
  });

  const pttButton = document.querySelector("[data-ptt-button]");
  if (pttButton) {
    pttButton.addEventListener("click", () => setListening(root.dataset.listening !== "on"));
  }

  if (editorStage) {
    editorStage.addEventListener("pointermove", schedulePosition);
    window.addEventListener("resize", () => {
      const rect = editorStage.getBoundingClientRect();
      positionOverlay(rect.left + rect.width * 0.46, rect.top + rect.height * 0.48);
    });
  }

  setTheme("dark");
  setStatus("live");
  setListening(true);
  setOverlay(true);
  setConfirm(false);

  if (editorStage) {
    const rect = editorStage.getBoundingClientRect();
    positionOverlay(rect.left + rect.width * 0.46, rect.top + rect.height * 0.48);
  }
})();
