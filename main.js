








(() => {
  const panels = [...document.querySelectorAll("[data-panel]")];
  const panelLinks = [...document.querySelectorAll("[data-panel-link]")];
  const stepButtons = [...document.querySelectorAll("[data-step]")];
  const readingPlane = document.querySelector(".reading-plane");
  const skipLink = document.querySelector(".skip-link");
  const position = document.querySelector("#panel-position");
  const localTime = document.querySelector("#local-time");
  const themeModeControls = [...document.querySelectorAll("[data-theme-mode]")];
  const projectSearch = document.querySelector("#project-search");
  const projectSearchClear = document.querySelector("#project-search-clear");
  const projectSearchStatus = document.querySelector("#project-search-status");
  const projectCards = [...document.querySelectorAll("[data-project-search]")];
  const secretaryToggle = document.querySelector("#secretary-toggle");
  const secretaryPanel = document.querySelector("#secretary-panel");
  const secretaryClose = document.querySelector("#secretary-close");
  const secretaryQuestionForm = document.querySelector("#secretary-question-form");
  const secretaryQuestion = document.querySelector("#secretary-question");
  const secretaryEmailHandoff = document.querySelector("#secretary-email-handoff");
  const secretaryWhatsAppHandoff = document.querySelector("#secretary-whatsapp-handoff");
  const inquiryForm = document.querySelector("#inquiry-form");
  const inquiryRoute = document.querySelector("#inquiry-route");
  const inquiryEmailHandoff = document.querySelector("#inquiry-email-handoff");
  const inquiryEmailStatus = document.querySelector("#inquiry-email-status");
  const conversation = document.querySelector("#conversation");
  const emailField = document.querySelector("#email-field");
  const phoneField = document.querySelector("#phone-field");
  const locationField = document.querySelector("#location-field");
  const smartbar = document.querySelector(".smartbar");
  const mark = document.querySelector(".brand-mark-rotor");
  const entryGate = document.querySelector("#entry-gate");
  const entryContinue = document.querySelector("#entry-continue");
  const entryDecline = document.querySelector("#entry-decline");
  const entryDeclineStatus = document.querySelector("#entry-decline-status");
  const entryAssistantTrigger = document.querySelector("#entry-assistant-trigger");
  const entryAssistant = document.querySelector("#entry-assistant");
  const entryAssistantForm = document.querySelector("#entry-assistant-form");
  const entryAssistantQuestion = document.querySelector("#entry-assistant-question");
  const entryAssistantReply = document.querySelector("#entry-assistant-reply");
  const welcomeSequence = document.querySelector("#welcome-sequence");
  const ambientVideo = document.querySelector(".matrix-video");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;
  let themeMode = themeModeControls.find((control) => control.getAttribute("aria-pressed") === "true")?.dataset.themeMode ?? "auto";
  let solarLongitude = null;
  let secretaryRestoreTarget = null;
  let entryGateActive = Boolean(entryGate);
  let welcomeReady = false;

  if (!panels.length) return;
  document.body.classList.add("js");
  if (saveData) document.body.classList.add("data-saver");
  const entryBackground = [...document.querySelectorAll(".skip-link, .welcome-sequence, .night-wash, .ambient-depth, .matrix-window, .smartbar, main, noscript")];
  if (entryGateActive) {
    entryBackground.forEach((element) => { element.inert = true; });
    document.body.classList.add("entry-gate-open");
  }

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const mix = (start, end, amount) => Math.round(start + (end - start) * amount);
  const luminance = (color) => color.reduce((sum, value, index) => {
    const channel = value / 255;
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  const contrastRatio = (first, second) => {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  const contrastSafeColor = (desired, background, minimum) => {
    if (contrastRatio(desired, background) >= minimum) return desired;
    const safeThreshold = minimum + 0.04;
    const candidates = [[0, 0, 0], [255, 255, 255]].map((target) => {
      let low = 0;
      let high = 1;
      for (let iteration = 0; iteration < 20; iteration += 1) {
        const amount = (low + high) / 2;
        const candidate = desired.map((value, index) => value + (target[index] - value) * amount);
        if (contrastRatio(candidate, background) >= safeThreshold) high = amount;
        else low = amount;
      }
      return desired.map((value, index) => Math.round(value + (target[index] - value) * high));
    }).filter((candidate) => contrastRatio(candidate, background) >= minimum);
    return candidates.sort((first, second) => {
      const distance = (color) => color.reduce((sum, value, index) => sum + (value - desired[index]) ** 2, 0);
      return distance(first) - distance(second);
    })[0];
  };
  const setColor = (name, daytime, nighttime, amount, background, minimum = 4.5) => {
    const desired = daytime.map((value, index) => mix(value, nighttime[index], amount));
    const values = contrastSafeColor(desired, background, minimum);
    document.documentElement.style.setProperty(name, `rgb(${values.join(" ")})`);
  };

  function nightAmount(hour) {
    if (hour >= 21 || hour < 4) return 1;
    if (hour >= 17) return smoothstep((hour - 17) / 4);
    if (hour < 7) return 1 - smoothstep((hour - 4) / 3);
    return 0;
  }

  function updateAmbience() {
    const now = new Date();
    const localHour = now.getHours() + now.getMinutes() / 60;
    const solarHour = solarLongitude === null
      ? localHour
      : ((now.getUTCHours() + now.getUTCMinutes() / 60 + solarLongitude / 15) % 24 + 24) % 24;
    const night = themeMode === "dark" ? 1 : themeMode === "light" ? 0 : nightAmount(solarHour);
    const root = document.documentElement;
    root.style.colorScheme = night >= 0.5 ? "dark" : "light";
    root.style.setProperty("--nightness", night.toFixed(3));
    root.style.setProperty("--matrix-opacity", (0.035 + night * 0.075).toFixed(3));
    root.style.setProperty("--shadow-strength", (0.10 * (1 - night)).toFixed(3));
    root.style.setProperty("--glow-strength", (0.42 * night).toFixed(3));
    root.style.setProperty("--plane-alpha", (0.78 - 0.17 * night).toFixed(3));
    const pageColor = [255, 255, 255].map((value, index) => mix(value, [30, 32, 53][index], night));
    root.style.setProperty("--page-bg", `rgb(${pageColor.join(" ")})`);
    setColor("--ink", [24, 32, 42], [237, 241, 250], night, pageColor);
    setColor("--muted", [88, 97, 109], [190, 199, 215], night, pageColor);
    setColor("--quiet", [107, 116, 126], [155, 168, 192], night, pageColor);
    setColor("--link", [38, 61, 88], [220, 232, 250], night, pageColor);
    setColor("--focus-ring", [72, 108, 148], [210, 228, 255], night, pageColor, 3);
    root.style.setProperty("--plane-rgb", `${mix(255, 10, night)}, ${mix(255, 16, night)}, ${mix(255, 35, night)}`);
    root.style.setProperty("--logo-invert", night.toFixed(3));
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content", night === 0 ? "#ffffff" : night === 1 ? "#1e2035" : "#7f809a",
    );
    if (localTime) {
      localTime.dateTime = now.toISOString();
      const dateParts = new Intl.DateTimeFormat(undefined, {
        day: "2-digit", month: "long", year: "numeric",
      }).formatToParts(now).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
      const timeText = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).format(now);
      localTime.textContent = `${dateParts.day} ${dateParts.month}, ${dateParts.year} | ${timeText}`;
    }
  }

  function updateProjectSearch() {
    if (!projectSearch) return;
    const query = projectSearch.value.trim().toLocaleLowerCase();
    const total = projectCards.length;
    let visible = 0;
    for (const card of projectCards) {
      const searchable = `${card.dataset.projectSearch ?? ""} ${card.textContent ?? ""}`.toLocaleLowerCase();
      const matches = !query || searchable.includes(query);
      card.hidden = !matches;
      if (matches) visible += 1;
    }
    if (projectSearchClear) projectSearchClear.hidden = !query;
    if (projectSearchStatus) {
      projectSearchStatus.textContent = query
        ? visible === 0
          ? `No projects match “${projectSearch.value.trim()}”. Clear the search to see all ${total} projects.`
          : `Showing ${visible} of ${total} projects.`
        : `Showing all ${total} projects.`;
    }
  }

  function showPanel(id, { updateHash = true, focus = false } = {}) {
    const index = panels.findIndex((panel) => panel.id === id);
    if (index < 0) return;
    if (readingPlane) readingPlane.scrollTop = 0;
    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === index;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
      panel.setAttribute("aria-hidden", String(!active));
    });
    panelLinks.forEach((link) => {
      if (link.dataset.panelLink === id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    stepButtons.forEach((button) => {
      const step = Number(button.dataset.step);
      button.disabled = step < 0 ? index === 0 : index === panels.length - 1;
    });
    const label = panels[index].dataset.label || (id === "about" ? "About" : id[0].toUpperCase() + id.slice(1));
    const navId = panels[index].dataset.nav || id;
    if (position) position.textContent = `${label} / ${String(index + 1).padStart(2, "0")} of ${String(panels.length).padStart(2, "0")}`;
    panelLinks.forEach((link) => {
      if (link.closest(".site-nav") && link.dataset.panelLink === navId) link.setAttribute("aria-current", "page");
    });
    if (updateHash && location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
    if (focus) panels[index].querySelector("h1")?.focus({ preventScroll: true });
    closeSecretary({ restoreFocus: false });
  }

  skipLink?.addEventListener("click", (event) => {
    event.preventDefault();
    panels.find((panel) => panel.classList.contains("is-active"))?.querySelector("h1")?.focus({ preventScroll: true });
  });

  function clearConversation() {
    if (!conversation) return;
    conversation.replaceChildren();
    addMessage("Hello. I can answer a small set of DarkBlaze questions using prepared replies.", "assistant");
    secretaryQuestionForm?.reset();
    inquiryForm?.reset();
    clearInquiryEmailDraft();
    if (inquiryForm) inquiryForm.hidden = true;
    updateConditionalFields();
  }

  function clearInquiryEmailDraft() {
    if (inquiryEmailHandoff) {
      inquiryEmailHandoff.hidden = true;
      inquiryEmailHandoff.href = "mailto:admin@darkblaze.org";
    }
    if (inquiryEmailStatus) {
      inquiryEmailStatus.hidden = true;
      inquiryEmailStatus.textContent = "";
    }
  }

  function addMessage(text, author) {
    const message = document.createElement("p");
    message.className = `message ${author}-message`;
    message.textContent = text;
    conversation?.append(message);
    if (author === "assistant") {
      const draft = `DarkBlaze website prepared reply:\n\n${text}`;
      const subject = encodeURIComponent("DarkBlaze website reply");
      const body = encodeURIComponent(draft);
      if (secretaryEmailHandoff) secretaryEmailHandoff.href = `mailto:admin@darkblaze.org?subject=${subject}&body=${body}`;
      if (secretaryWhatsAppHandoff) secretaryWhatsAppHandoff.href = `https://wa.me/27847768997?text=${body}`;
    }
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }

  function openSecretary({ focus = true } = {}) {
    if (!secretaryPanel || !secretaryToggle) return;
    secretaryPanel.hidden = false;
    secretaryToggle.hidden = true;
    if (secretaryQuestionForm) secretaryQuestionForm.hidden = false;
    secretaryToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("secretary-open");
    if (focus) window.setTimeout(() => secretaryQuestion?.focus(), 40);
  }

  function closeSecretary({ restoreFocus = true } = {}) {
    if (!secretaryPanel || secretaryPanel.hidden) return;
    const restoreTarget = secretaryRestoreTarget ?? secretaryToggle;
    secretaryRestoreTarget = null;
    secretaryPanel.hidden = true;
    secretaryToggle.hidden = false;
    if (secretaryQuestionForm) secretaryQuestionForm.hidden = true;
    secretaryToggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("secretary-open");
    clearConversation();
    if (restoreFocus && restoreTarget) {
      restoreTarget.focus({ preventScroll: true });
    }
  }

  function updateConditionalFields() {
    clearInquiryEmailDraft();
    const route = inquiryRoute?.value ?? "question";
    const conditions = [
      [emailField, route === "email"],
      [phoneField, route === "callback"],
      [locationField, route === "location"],
    ];
    conditions.forEach(([field, visible]) => {
      if (!field) return;
      field.hidden = !visible;
      const input = field.querySelector("input");
      if (input) input.value = "";
    });
    const email = document.querySelector("#reply-email");
    if (email) email.required = route === "email";
    const phone = document.querySelector("#callback-phone");
    if (phone) phone.required = route === "callback";
  }

  function detectRoute(question) {
    const explicitEmailRequest = /\b(email me|send (?:this|it|that) by email|reply by email|respond by email|request an email|email reply|email request)\b/i.test(question);
    if (!explicitEmailRequest && !/\b(preview|draft|sample)\b/i.test(question)) return null;
    if (/call|phone|telephone|callback/i.test(question)) return "callback";
    if (/address|location|nearby|area|where/i.test(question)) return "location";
    if (/email|contact|reply|respond/i.test(question)) return "email";
    return "question";
  }

  function preparedReply(question) {
    if (/timeline|when|progress|milestone|date/i.test(question)) {
      return "No project timeline is published here. This uses prepared replies; no live assistant service is connected.";
    }
    if (/\b(ucc|universal constraint computing|constraint computing)\b/i.test(question)) {
      return "In plain terms, UCC explores how to state what a computing system should do, what it may do, and which limits it must respect. Technically, it proposes describing intent, context, effects, uncertainty, authority, and resource bounds; complete end-to-end enforcement is not yet established.";
    }
    if (/\bsenseos\b/i.test(question)) {
      return "SenseOS is an experimental operating-system project. Its current prototypes cover selected boot, persistence, process-admission, filesystem, capability, and interface paths; it is not a production-ready general-purpose OS.";
    }
    if (/\bsenseui\b/i.test(question)) {
      return "SenseUI aims to provide one adaptive interface for different kinds of information and applications. Rust-based declarative UI and runtime foundations are in development; a complete live compositor is not yet demonstrated.";
    }
    if (/\bhnden\b|neural.?lattice/i.test(question)) {
      return "HNDEN is presented in a separate visual showcase. Its moving neural-lattice image is an illustrative visualization; the complete mathematical projection contract is still being validated.";
    }
    if (/project|work|build/i.test(question)) {
      return "The current site presents UCC, SenseOS, SenseUI, and a separate HNDEN neural-lattice showcase. The work is at different stages of research and development. This assistant uses prepared public summaries, not a live AI.";
    }
    if (/call|phone|telephone|callback/i.test(question)) {
      return "The website cannot place calls or schedule callbacks automatically. You can prepare a callback request email to admin@darkblaze.org below, or call +27 84 776 8997.";
    }
    if (/address|location|nearby|area|where/i.test(question)) {
      return "After you press Continue, your browser may share location for this visit's local color adjustment. If allowed, longitude remains in page memory while this page is open; closing or reloading clears it. The site does not save or transmit it. You can deny location and still enter. Your browser may remember its own permission setting; the site does not save consent.";
    }
    if (/email|contact|reply|respond/i.test(question)) {
      return "Contact DarkBlaze at admin@darkblaze.org, on WhatsApp at +27 84 776 8997, or by phone at +27 84 776 8997. Use the Email or WhatsApp reply buttons to review a draft; this assistant does not send it.";
    }
    return "This local assistant uses prepared replies; no live AI is connected. Ask about a project or timeline, or ask how to contact DarkBlaze. Ask to email a request if you want to prepare a message in your own email app.";
  }

  panelLinks.forEach((link) => link.addEventListener("click", (event) => {
    const id = link.dataset.panelLink;
    if (!panels.some((panel) => panel.id === id)) return;
    event.preventDefault();
    showPanel(id, { focus: true });
  }));

  projectSearch?.addEventListener("input", updateProjectSearch);
  projectSearchClear?.addEventListener("click", () => {
    if (!projectSearch) return;
    projectSearch.value = "";
    updateProjectSearch();
    projectSearch.focus();
  });
  themeModeControls.forEach((control) => control.addEventListener("click", () => {
    themeMode = control.dataset.themeMode ?? "auto";
    themeModeControls.forEach((choice) => choice.setAttribute("aria-pressed", String(choice === control)));
    updateAmbience();
  }));

  function leaveEntryGate() {
    if (!entryGateActive) return;
    entryGateActive = false;
    entryGate.hidden = true;
    document.body.classList.remove("entry-gate-open");
    entryBackground.forEach((element) => { element.inert = false; });
    document.querySelector("#home-title")?.focus({ preventScroll: true });
    requestLocationForSolarTheme();
    syncAmbientVideo();
    if (welcomeReady) playWelcomeSequence();
  }
  entryContinue?.addEventListener("click", leaveEntryGate);
  function requestLocationForSolarTheme() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      solarLongitude = position.coords.longitude;
      updateAmbience();
    }, () => {
      solarLongitude = null;
      updateAmbience();
    }, { enableHighAccuracy: false, maximumAge: 0, timeout: 8000 });
  }
  entryDecline?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else if (entryDeclineStatus) entryDeclineStatus.textContent = "There is no previous page in this tab. Close this tab to leave DarkBlaze.";
    if (entryDeclineStatus) entryDeclineStatus.hidden = false;
  });
  entryAssistantTrigger?.addEventListener("click", () => {
    const isOpen = entryAssistant?.hidden === false;
    if (entryAssistant) entryAssistant.hidden = isOpen;
    entryAssistantTrigger.setAttribute("aria-expanded", String(!isOpen));
    if (!isOpen) entryAssistantQuestion?.focus();
  });
  entryAssistantForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = entryAssistantQuestion?.value.trim();
    if (!question || !entryAssistantReply) return;
    entryAssistantReply.textContent = preparedReply(question);
    entryAssistantReply.hidden = false;
    entryAssistantForm.reset();
    entryAssistantQuestion?.focus();
  });
  entryGate?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusables = [...entryGate.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')].filter((element) => !element.closest("[hidden]"));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  entryContinue?.focus({ preventScroll: true });

  window.addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    showPanel(panels.some((panel) => panel.id === id) ? id : panels[0].id, {
      updateHash: false,
      focus: true,
    });
  });

  stepButtons.forEach((button) => button.addEventListener("click", () => {
    const current = panels.findIndex((panel) => panel.classList.contains("is-active"));
    const next = current + Number(button.dataset.step);
    if (panels[next]) showPanel(panels[next].id, { focus: true });
  }));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && secretaryPanel && !secretaryPanel.hidden) {
      event.preventDefault();
      closeSecretary();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("a, button, input, textarea, select, summary")) return;
    const current = panels.findIndex((panel) => panel.classList.contains("is-active"));
    if ((event.key === "ArrowRight" || event.key === "PageDown") && panels[current + 1]) {
      event.preventDefault();
      showPanel(panels[current + 1].id, { focus: true });
    } else if ((event.key === "ArrowLeft" || event.key === "PageUp") && panels[current - 1]) {
      event.preventDefault();
      showPanel(panels[current - 1].id, { focus: true });
    }
  });

  secretaryToggle?.addEventListener("click", () => {
    if (secretaryPanel?.hidden) openSecretary();
    else secretaryQuestion?.focus();
  });
  secretaryClose?.addEventListener("click", () => closeSecretary());
  document.addEventListener("focusin", (event) => {
    if (secretaryPanel && !secretaryPanel.hidden && event.target instanceof Node && !smartbar?.contains(event.target)) {
      closeSecretary({ restoreFocus: false });
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (secretaryPanel && !secretaryPanel.hidden && event.target instanceof Node && !smartbar?.contains(event.target)) {
      closeSecretary({ restoreFocus: false });
    }
  });

  secretaryQuestionForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = secretaryQuestion?.value.trim();
    if (!question) return;
    if (secretaryQuestion) secretaryQuestion.value = "";
    addMessage(question, "visitor");
    addMessage(preparedReply(question), "assistant");
    const route = detectRoute(question);
    if (inquiryForm) {
      if (route === null) inquiryForm.reset();
      inquiryForm.hidden = route === null;
    }
    if (inquiryRoute) inquiryRoute.value = route ?? "question";
    updateConditionalFields();
    window.requestAnimationFrame(() => {
      if (conversation) conversation.scrollTop = conversation.scrollHeight;
    });
  });
  inquiryRoute?.addEventListener("change", updateConditionalFields);
  inquiryForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!inquiryForm.reportValidity()) return;
    const route = inquiryRoute?.value ?? "question";
    const latestQuestion = [...(conversation?.querySelectorAll(".visitor-message") ?? [])].at(-1)?.textContent?.trim() ?? "";
    const preparedResponse = [...(conversation?.querySelectorAll(".assistant-message") ?? [])].at(-1)?.textContent?.trim() ?? "";
    const email = document.querySelector("#reply-email")?.value.trim() ?? "";
    const phone = route === "callback" ? document.querySelector("#callback-phone")?.value.trim() ?? "" : "";
    const location = route === "location" ? document.querySelector("#coarse-location")?.value.trim() ?? "" : "";
    const requestType = route === "callback" ? "Callback request" : route === "location" ? "Location-related question" : "Question for DarkBlaze";
    const details = [
      "DarkBlaze Group website request",
      "",
      `Request type: ${requestType}`,
      email ? `Visitor reply email: ${email}` : "",
      phone ? `Visitor phone: ${phone}` : "",
      location ? `Broad area: ${location}` : "",
      latestQuestion ? `\nVisitor question:\n${latestQuestion}` : "",
      preparedResponse ? `\nSite Secretary prepared response:\n${preparedResponse}` : "",
      "\nThe visitor prepared this draft and will send it from their email app.",
    ].filter(Boolean).join("\n");
    const subject = encodeURIComponent(`DarkBlaze website: ${requestType.toLowerCase()}`);
    const body = encodeURIComponent(details);
    if (inquiryEmailHandoff) {
      inquiryEmailHandoff.href = `mailto:admin@darkblaze.org?subject=${subject}&body=${body}`;
      inquiryEmailHandoff.hidden = false;
    }
    if (inquiryEmailStatus) {
      inquiryEmailStatus.textContent = "Email draft prepared. Your email app may open when you choose the link below. Review the recipients and message, then press Send in that app. No confirmation is sent automatically.";
      inquiryEmailStatus.hidden = false;
    }
  });

  let lastInteraction = 0;
  ["pointerdown", "keydown", "touchstart"].forEach((name) => {
    document.addEventListener(name, () => { lastInteraction = Date.now(); }, { passive: true });
  });
  function flipBrandMark() {
    if (!mark || reducedMotion.matches || document.visibilityState !== "visible") return;
    if (Date.now() - lastInteraction < 2200 || document.body.classList.contains("secretary-open")) return;
    mark.classList.remove("is-flipping");
    void mark.offsetWidth;
    mark.classList.add("is-flipping");
    window.setTimeout(() => mark.classList.remove("is-flipping"), 1550);
  }

  function syncAmbientVideo() {
    if (!ambientVideo) return;
    if (entryGateActive || reducedMotion.matches || saveData || document.visibilityState !== "visible") {
      ambientVideo.pause();
      return;
    }
    const source = ambientVideo.querySelector("source[data-src]");
    if (source && !source.hasAttribute("src")) {
      source.src = source.dataset.src;
      ambientVideo.load();
    }
    ambientVideo.play().catch(() => document.body.classList.add("ambient-video-failed"));
  }
  ambientVideo?.addEventListener("error", () => document.body.classList.add("ambient-video-failed"));
  ambientVideo?.addEventListener("playing", () => document.body.classList.remove("ambient-video-failed"));

  updateAmbience();
  updateProjectSearch();
  updateConditionalFields();
  if (secretaryToggle) secretaryToggle.disabled = false;
  syncAmbientVideo();
  function playWelcomeSequence() {
    if (!welcomeSequence || reducedMotion.matches || saveData) return;
    welcomeSequence.hidden = false;
    document.body.classList.add("welcome-playing");
    const finish = () => {
      document.body.classList.remove("welcome-playing");
      welcomeSequence.hidden = true;
      welcomeSequence.removeEventListener("animationend", onAnimationEnd);
    };
    const onAnimationEnd = (event) => {
      if (event.target === welcomeSequence && event.animationName === "welcome-fade") finish();
    };
    welcomeSequence.addEventListener("animationend", onAnimationEnd);
    window.setTimeout(finish, 5200);
  }
  window.addEventListener("load", () => {
    welcomeReady = true;
    if (!entryGateActive) playWelcomeSequence();
  }, { once: true });
  reducedMotion.addEventListener?.("change", () => {
    syncAmbientVideo();
    if (reducedMotion.matches && welcomeSequence) {
      welcomeSequence.hidden = true;
      document.body.classList.remove("welcome-playing");
    }
  });
  document.addEventListener("visibilitychange", syncAmbientVideo);
  window.setInterval(updateAmbience, 30_000);
  window.setInterval(flipBrandMark, 5_000);
  const initialPanel = location.hash.slice(1);
  showPanel(panels.some((panel) => panel.id === initialPanel) ? initialPanel : panels[0].id, { updateHash: false });
})();




