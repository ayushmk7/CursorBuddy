(function () {
  const config = window.CURSORBUDDY_CONFIG || {};
  const thankYouPath = config.thankYouPath || "/thanks/";
  const thankYouMode = config.thankYouMode || "route";
  const requestTimeoutMs = Number(config.requestTimeoutMs || 10000);
  const dialog = document.querySelector("[data-waitlist-dialog]");
  const submitButton = document.querySelector("[data-submit-button]");
  const form = document.querySelector("[data-waitlist-form]");
  const formStatus = document.querySelector("[data-form-status]");
  const nameField = form ? form.querySelector('input[name="name"]') : null;
  const emailField = form ? form.querySelector('input[name="email"]') : null;
  const preferredField = form ? form.querySelector("[data-preferred-app]") : null;
  const nameHint = document.querySelector("[data-name-hint]");
  const fieldHint = document.querySelector("[data-field-hint]");
  const appHint = document.querySelector("[data-app-hint]");
  const yearNodes = document.querySelectorAll("[data-year]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastFocusEl = null;

  yearNodes.forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  if (!prefersReducedMotion) {
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll(".scroll-reveal").forEach((node) => observer.observe(node));
  } else {
    document.querySelectorAll(".scroll-reveal").forEach((node) => node.classList.add("is-visible"));
  }

  function openWaitlistDialog() {
    if (!dialog || typeof dialog.showModal !== "function") {
      return;
    }
    lastFocusEl = document.activeElement;
    dialog.showModal();
    window.setTimeout(() => {
      const focusTarget = emailField || form?.querySelector("input, select, button");
      if (focusTarget && typeof focusTarget.focus === "function") {
        focusTarget.focus();
      }
    }, 0);
  }

  function closeWaitlistDialog() {
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  document.querySelectorAll("[data-open-waitlist]").forEach((node) => {
    node.addEventListener("click", () => openWaitlistDialog());
  });

  document.querySelectorAll("[data-close-waitlist]").forEach((node) => {
    node.addEventListener("click", () => closeWaitlistDialog());
  });

  if (dialog) {
    dialog.addEventListener("close", () => {
      if (lastFocusEl && typeof lastFocusEl.focus === "function") {
        lastFocusEl.focus();
      }
    });

    dialog.addEventListener("click", (event) => {
      const panel = dialog.querySelector(".waitlist-dialog__panel");
      if (panel && !panel.contains(event.target)) {
        dialog.close();
      }
    });
  }

  if (window.location.hash === "#waitlist") {
    openWaitlistDialog();
  }

  if (!form || !submitButton || !formStatus || !emailField || !nameField) {
    return;
  }

  nameField.addEventListener("input", () => {
    nameField.removeAttribute("aria-invalid");
    if (nameHint) {
      nameHint.textContent = "";
    }
  });

  emailField.addEventListener("input", () => {
    emailField.removeAttribute("aria-invalid");
    if (fieldHint) {
      fieldHint.textContent = "";
    }
  });

  if (preferredField) {
    preferredField.addEventListener("change", () => {
      if (appHint) {
        appHint.textContent = "";
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const preferredApp = preferredField ? String(preferredField.value || "").trim() : "";
    const honeypot = String(formData.get("bot-field") || "").trim();

    clearStatus();

    if (!name) {
      nameField.setAttribute("aria-invalid", "true");
      if (nameHint) {
        nameHint.textContent = "Enter your name.";
      }
      nameField.focus();
      return;
    }

    if (!isValidEmail(email)) {
      emailField.setAttribute("aria-invalid", "true");
      if (fieldHint) {
        fieldHint.textContent = "Enter a valid email address.";
      }
      return;
    }

    if (!preferredApp) {
      if (appHint) {
        appHint.textContent = "Pick where you want CursorBuddy next.";
      }
      if (preferredField) {
        preferredField.focus();
      }
      return;
    }

    setSubmitting(true);

    try {
      if (honeypot) {
        await handleSuccess("Thanks. Your request was received.");
        return;
      }

      const mode = resolveSubmissionMode(config);
      if (mode === "endpoint") {
        await submitToEndpoint({
          endpoint: getWaitlistEndpoint(config),
          email,
          name,
          preferredApp,
          timeoutMs: requestTimeoutMs,
        });
      } else if (mode === "netlify") {
        await submitToNetlify(formData, requestTimeoutMs);
      } else {
        await submitToMock({
          email,
          name,
          preferredApp,
          storageKey: config.mockStorageKey || "cursorbuddy-waitlist-preview",
        });
      }

      const successMessage =
        mode === "mock"
          ? "Preview mode saved your request locally. Set a live endpoint before production."
          : "Thanks. Your spot is saved.";

      await handleSuccess(successMessage);
    } catch (error) {
      if (error instanceof WaitlistError && error.code === "duplicate") {
        setStatus(
          "info",
          "You are already on the list",
          "That email is already queued for updates, so there is nothing else to do."
        );
      } else if (error instanceof WaitlistError && error.code === "validation") {
        setStatus("error", "Check your details", error.message);
      } else if (error && error.name === "AbortError") {
        setStatus(
          "error",
          "Request timed out",
          "Your network may be slow or the server is busy. Try again in a moment."
        );
      } else {
        const fromServer = error instanceof WaitlistError && error.message ? error.message : "";
        const detail = fromServer
          ? `${fromServer} If you still need help, contact contactayushmadhav@gmail.com.`
          : "Please try again in a moment. If the issue persists, contact contactayushmadhav@gmail.com.";
        setStatus("error", "Something went wrong", detail);
      }
    } finally {
      setSubmitting(false);
    }
  });

  async function handleSuccess(detail) {
    setStatus("success", "You are in", detail);

    if (thankYouMode === "route") {
      if (prefersReducedMotion) {
        window.location.assign(thankYouPath);
        return;
      }

      await delay(900);
      window.location.assign(thankYouPath);
    } else {
      form.reset();
    }
  }

  function resolveSubmissionMode(runtimeConfig) {
    if (runtimeConfig.waitlistMode) {
      return runtimeConfig.waitlistMode;
    }

    if (runtimeConfig.waitlistEndpoint) {
      return "endpoint";
    }

    if (isLocalPreview()) {
      return "mock";
    }

    return "endpoint";
  }

  function getWaitlistEndpoint(runtimeConfig) {
    const explicit = String(runtimeConfig.waitlistEndpoint || "").trim();
    if (explicit) {
      return explicit;
    }
    return "/api/waitlist";
  }

  function isLocalPreview() {
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
  }

  async function submitToEndpoint({ endpoint, email, name, preferredApp, timeoutMs }) {
    if (!endpoint) {
      throw new WaitlistError("config", "No endpoint configured.");
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          preferredApp,
          source: "cursorbuddy-landingpage",
          submittedAt: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timer);
    }

    const responseBody = await readResponseBody(response);

    if (response.status === 409) {
      throw new WaitlistError("duplicate", "Duplicate submission.");
    }

    if (!response.ok) {
      const bodyObj = responseBody && typeof responseBody === "object" ? responseBody : null;
      const maybeCode = bodyObj ? bodyObj.code : "";
      const maybeError = bodyObj ? bodyObj.error : "";
      const maybeDetail = bodyObj ? bodyObj.detail : "";

      if (String(maybeCode).toLowerCase() === "duplicate" || String(maybeError).toLowerCase().includes("duplicate")) {
        throw new WaitlistError("duplicate", "Duplicate submission.");
      }

      const serverMessage = [maybeError, maybeDetail].filter(Boolean).join(" ").trim();
      if (response.status === 400 || String(maybeCode).toLowerCase() === "validation") {
        throw new WaitlistError("validation", serverMessage || "Check the form and try again.");
      }

      throw new WaitlistError(
        "server",
        serverMessage || "Submission failed. The waitlist service may be misconfigured or temporarily unavailable."
      );
    }
  }

  async function submitToNetlify(formData, timeoutMs) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body = new URLSearchParams();
      formData.forEach((value, key) => {
        body.append(key, String(value));
      });

      const response = await fetch("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new WaitlistError("server", "Netlify form submission failed.");
      }
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function submitToMock({ email, name, preferredApp, storageKey }) {
    const raw = window.localStorage.getItem(storageKey);
    const entries = raw ? JSON.parse(raw) : [];
    const normalizedEmail = email.toLowerCase();

    if (entries.some((entry) => String(entry.email || "").toLowerCase() === normalizedEmail)) {
      throw new WaitlistError("duplicate", "Duplicate submission.");
    }

    entries.push({
      email,
      name,
      preferredApp,
      submittedAt: new Date().toISOString(),
    });

    window.localStorage.setItem(storageKey, JSON.stringify(entries));
  }

  function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Saving your spot..." : "Join Waitlist";
  }

  function clearStatus() {
    formStatus.removeAttribute("data-state");
    formStatus.replaceChildren();
  }

  function setStatus(state, title, detail) {
    clearStatus();

    const titleNode = document.createElement("p");
    titleNode.className = "form-status__title";
    titleNode.textContent = title;

    const detailNode = document.createElement("p");
    detailNode.className = "form-status__detail";
    detailNode.textContent = detail;

    formStatus.dataset.state = state;
    formStatus.append(titleNode, detailNode);
  }

  async function readResponseBody(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function WaitlistError(code, message) {
    this.name = "WaitlistError";
    this.code = code;
    this.message = message;
  }

  WaitlistError.prototype = Object.create(Error.prototype);
  WaitlistError.prototype.constructor = WaitlistError;
})();
