(() => {
  const views = new Map([...document.querySelectorAll('[data-senseui-view]')].map(node => [node.dataset.senseuiView, node]));
  const surfaceContent = document.getElementById('surface-content');
  const profiles = { home: 'quiet', work: 'work', ucc: 'research', senseos: 'platform', senseui: 'platform', about: 'about', hnden: 'connected-field', sphere: 'research', privacy: 'quiet', terms: 'quiet', accessibility: 'quiet', notices: 'quiet' };
  const pageTitles = { "home": "DarkBlaze Group", "work": "Work — DarkBlaze Group", "ucc": "Universal Constraint Computing — DarkBlaze Group", "senseos": "SenseOS — DarkBlaze Group", "senseui": "SenseUI — DarkBlaze Group", "about": "About — DarkBlaze Group", "hnden": "HNDEN — DarkBlaze Group", "sphere": "Sphere — DarkBlaze Group", "privacy": "Privacy notice — DarkBlaze Group", "terms": "Terms of use — DarkBlaze Group", "accessibility": "Accessibility — DarkBlaze Group", "notices": "Credits and third-party notices — DarkBlaze Group" };
  const pageDescriptions = { "home": "DarkBlaze Group develops research and prototypes across computer systems, adaptive interfaces, and neural-network design.", "work": "Explore DarkBlaze research across UCC, Rust-Sense, SenseOS, SenseUI, HNDEN, and Sphere: Rosetta with 0xAlexandria.", "ucc": "Universal Constraint Computing explores declaring system purpose, permitted actions, and resource limits before execution.", "senseos": "SenseOS is a research direction for a coherent computer environment and a shared SenseUI surface.", "senseui": "SenseUI explores one Rust-authored adaptive visual surface for web, mobile, and the planned SenseOS userspace.", "about": "Learn about DarkBlaze Group, its founder, research journey, and work with aligned engineering and research partners.", "hnden": "HNDEN is DarkBlaze Group's first-generation neural-network design prototype and research direction.", "sphere": "Sphere unites Rosetta and 0xAlexandria in research toward traceable, bounded translation from intent to machine representations.", "privacy": "Read the current DarkBlaze website privacy notice, including browser behavior and unresolved hosting-log questions.", "terms": "Review the draft DarkBlaze Group website terms of use; owner and jurisdiction-specific legal review remain pending.", "accessibility": "Read DarkBlaze's initial accessibility statement, known limitations, and contact path for reporting a barrier.", "notices": "Review credits, third-party references, software dependencies, and asset licensing notices for the DarkBlaze site." };
  const metaDescription = document.querySelector('meta[name="description"]');
  const preparedReplies = [{"phrases":["hnden"],"response":"HNDEN is our first-generation neural-network design prototype. It is an early expression of the direction we want to explore; this site shares the vision without publishing its implementation details.","topic":"HNDEN","words":[]},{"phrases":["senseui","interface"],"response":"SenseUI is our Rust-based effort to create one adaptive surface across web, mobile, and, over time, SenseOS. This R16 site is authored in Rust and generates browser-ready files; a native SenseUI runtime is still a development goal.","topic":"SenseUI","words":[]},{"phrases":["senseos","operating system"],"response":"SenseOS is our longer-term operating-system direction. Its current architecture treats files, processes, services, and network endpoints as typed objects, with filesystem paths acting as one view of that shared object space. Native compatibility is a long-term goal: current syscall catalogs are inventories, and the reviewed Linux x86_64 path handles only write, exit, and exit_group calls. SenseOS remains in development; this website is not a complete operating system.","topic":"SenseOS","words":[]},{"phrases":["constraint"],"response":"Universal Constraint Computing is ongoing research into making purpose, permissions, and limits explicit. We have not yet demonstrated complete, end-to-end enforcement.","topic":"Universal Constraint Computing","words":["ucc"]},{"phrases":["sphere","rosetta","alexandria"],"response":"Sphere currently mirrors bounded, intent-defined representations across JSON, Rust, and raw-machine forms. The broader aim is to extend this approach to other languages through calibrated, verified profiles. Arbitrary-language compilation is not available today.","topic":"Sphere · Rosetta · 0xAlexandria","words":[]},{"phrases":["privacy"],"response":"This page does not use analytics, tracking cookies, or browser storage. Hosting-provider connection logging has not been verified. The Privacy section explains what the current site does and does not handle.","topic":"Privacy","words":[]},{"phrases":["invest","fund"],"response":"DarkBlaze is looking for aligned engineering, research, and compute support. Funding amounts, legal entity details, and investment terms have not been published.","topic":"Aligned support","words":[]},{"phrases":["contact"],"response":"You can reach DarkBlaze at admin@darkblaze.org. The email and WhatsApp options prepare a message for you to review; nothing is sent until you choose to send it.","topic":"Contact","words":[]}];
  const SITE_AI_ENDPOINT = "https://darkblaze-r16-ai.ekkerdb.workers.dev/chat";
  const SITE_AI_PAGES = new Set(['home','work','ucc','senseos','senseui','about','hnden','sphere','privacy','terms','accessibility','notices']);
  function validateSiteAssistantResult(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (typeof value.reply !== 'string' || !value.reply.trim() || [...value.reply].length > 6000) return null;
    const actions = value.actions === undefined ? [] : value.actions;
    if (!Array.isArray(actions) || actions.length > 3) return null;
    const checked = [];
    for (const action of actions) {
      if (!action || typeof action !== 'object' || Array.isArray(action)) return null;
      if (action.type === 'navigate' && SITE_AI_PAGES.has(action.page)) {
        if (Object.keys(action).some(key => !['type', 'page'].includes(key))) return null;
        checked.push({type: 'navigate', page: action.page});
      } else if (['search_projects', 'search_site'].includes(action.type)) {
        if (Object.keys(action).some(key => !['type', 'query'].includes(key))) return null;
        if (typeof action.query !== 'string' || !action.query.trim() || [...action.query.trim()].length > 120) return null;
        checked.push({type: action.type, query: action.query.trim()});
      } else return null;
    }
    return {reply: value.reply.trim(), actions: checked};
  }
  async function readSiteAiStream(response, onDelta) {
    const maxBytes = 524288;
    if (!response.body || !response.body.getReader) throw new Error('stream_unavailable');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const toolCalls = new Map();
    let reply = '';
    let buffer = '';
    let total = 0;
    function readEvent(block) {
      const data = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data || data === '[DONE]') return;
      const packet = JSON.parse(data);
      const delta = packet && packet.choices && packet.choices[0] && packet.choices[0].delta;
      if (!delta) return;
      if (typeof delta.content === 'string' && delta.content) {
        reply += delta.content;
        if ([...reply].length > 6000) throw new Error('reply_too_large');
        if (typeof onDelta === 'function') onDelta(reply);
      }
      if (Array.isArray(delta.tool_calls)) for (const part of delta.tool_calls) {
        if (!part || !Number.isInteger(part.index)) continue;
        const call = toolCalls.get(part.index) || {name: '', arguments: ''};
        if (part.function && typeof part.function.name === 'string') call.name += part.function.name;
        if (part.function && typeof part.function.arguments === 'string') call.arguments += part.function.arguments;
        if (call.arguments.length > 4096) throw new Error('tool_payload_too_large');
        toolCalls.set(part.index, call);
      }
    }
    for (;;) {
      const part = await reader.read();
      if (part.done) {
        buffer += decoder.decode();
        if (buffer.trim()) readEvent(buffer);
        break;
      }
      total += part.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error('response_too_large');
      }
      buffer = (buffer + decoder.decode(part.value, {stream: true})).replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        readEvent(event);
      }
    }
    const actions = [];
    for (const call of toolCalls.values()) {
      if (call.name !== 'site_actions') continue;
      let value;
      try { value = JSON.parse(call.arguments); } catch (_) { continue; }
      if (value && Array.isArray(value.actions)) actions.push(...value.actions);
    }
    const checked = validateSiteAssistantResult({
      reply: reply.trim() || (actions.length ? 'I’ve updated the site to match your request.' : ''),
      actions
    });
    return checked;
  }
  const SITE_AI_GUIDANCE = 'You are the DarkBlaze Site Secretary. Welcome general discussion as well as questions about the site and its projects. Speak in warm, calm, direct, natural full sentences, with the clarity of a public-transit announcement and no theatrical imitation. Use recent conversation turns only to understand this session; do not infer sensitive traits or claim lasting memory. For DarkBlaze facts, rely only on the supplied site context, state plainly when information is missing, and never invent dates, capabilities, funding terms, or status. Keep navigation and search suggestions within the supplied allowlist.';
  async function requestSiteAssistant(questionText, activePage, context, conversation, onDelta) {
    if (!SITE_AI_ENDPOINT) return {ok: false, kind: 'offline'};
    if (typeof questionText !== 'string' || !questionText.trim() || questionText.length > 240 || !SITE_AI_PAGES.has(activePage)) return {ok: false, kind: 'invalid_request'};
    const recentTurns = Array.isArray(conversation) ? conversation.slice(-8).flatMap(turn => {
      if (!turn || !['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string') return [];
      const content = turn.content.trim().slice(0, 1200);
      return content ? [{role: turn.role, content}] : [];
    }) : [];
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(SITE_AI_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question: questionText.trim(), active_page: activePage, context: String(context || '').slice(0, 12000), conversation: recentTurns, response_guidance: SITE_AI_GUIDANCE}),
        signal: controller.signal
      });
      if (!response.ok) return {ok: false, kind: 'service_unavailable'};
      if (!(response.headers.get('content-type') || '').toLowerCase().includes('text/event-stream')) return {ok: false, kind: 'invalid_response'};
      let data;
      try { data = await readSiteAiStream(response, onDelta); } catch (_) { return {ok: false, kind: 'invalid_response'}; }
      return data ? {ok: true, data} : {ok: false, kind: 'invalid_response'};
    } catch (error) {
      return {ok: false, kind: error && error.name === 'AbortError' ? 'timeout' : 'service_unavailable'};
    } finally {
      window.clearTimeout(timer);
    }
  }
  function dispatchSiteAssistantActions(actions, handlers) {
    const checked = validateSiteAssistantResult({reply: 'Action request', actions});
    if (!checked) return false;
    for (const action of checked.actions) {
      if (action.type === 'navigate' && typeof handlers.navigate === 'function') handlers.navigate(action.page);
      else if (action.type === 'search_projects' && typeof handlers.searchProjects === 'function') handlers.searchProjects(action.query);
      else if (action.type === 'search_site' && typeof handlers.searchSite === 'function') handlers.searchSite(action.query);
    }
    return true;
  }

  const navItems = [...document.querySelectorAll('[data-senseui-projection]')];
  const ambient = document.querySelector('[data-hnden-ambient]');
  const assistant = document.getElementById('assistant-dialog');
  const trigger = document.querySelector('[data-senseui-ai-toggle]');
  const assistantConversation = [];
  const assistantThread = document.getElementById('assistant-thread');
  const assistantMessages = document.getElementById('assistant-messages');
  const assistantEmptyState = document.getElementById('assistant-empty-state');
  const assistantStatus = document.getElementById('assistant-status');
  const assistantForm = document.getElementById('assistant-composer');
  const question = document.getElementById('assistant-question');
  const clearConversation = document.getElementById('assistant-clear');
  const assistantActions = document.getElementById('assistant-actions');
  const assistantSubmit = document.getElementById('assistant-submit');
  const emailReply = document.getElementById('assistant-email-reply');
  const whatsappReply = document.getElementById('assistant-whatsapp-reply');
  const requestDetails = document.getElementById('assistant-request');
  const requestForm = document.getElementById('assistant-request-form');
  const requestType = document.getElementById('request-type');
  const requestEmailField = document.getElementById('request-email-field');
  const requestPhoneField = document.getElementById('request-phone-field');
  const requestEmail = document.getElementById('request-email');
  const requestPhone = document.getElementById('request-phone');
  const requestStatus = document.getElementById('request-email-status');
  const requestHandoff = document.getElementById('request-email-handoff');
  let latestQuestion = '';
  let latestReply = '';
  let assistantBusy = false;
  function setAiStatus(status, title) {
    trigger.dataset.aiStatus = status;
    trigger.title = title;
    trigger.setAttribute('aria-label', 'Open DarkBlaze assistant. ' + title);
  }
  setAiStatus(SITE_AI_ENDPOINT ? 'configured' : 'local', SITE_AI_ENDPOINT ? 'AI service is configured; availability is checked when you send a message' : 'Prepared site responses are available; no live model is connected');
  function appendAssistantMessage(role, text) {
    const article = document.createElement('article');
    article.className = `assistant-message assistant-message-${role}`;
    article.dataset.messageRole = role;
    const label = document.createElement('span');
    label.className = 'assistant-message-label';
    label.textContent = role === 'user' ? 'You' : 'Site Secretary';
    const copy = document.createElement('p');
    copy.className = 'assistant-message-copy';
    copy.textContent = text;
    article.append(label, copy);
    assistantMessages.append(article);
    assistantEmptyState.hidden = true;
    assistantThread.scrollTop = assistantThread.scrollHeight;
    return {article, copy};
  }
  function assistantIsNearBottom() {
    return assistantThread.scrollHeight - assistantThread.scrollTop - assistantThread.clientHeight < 96;
  }
  function resizeAssistantComposer() {
    question.style.height = 'auto';
    question.style.height = `${Math.min(question.scrollHeight, 144)}px`;
  }
  function syncAssistantViewport() {
    const viewport = window.visualViewport;
    if (!viewport || !assistant.open) return;
    assistant.style.setProperty('--assistant-viewport-height', `${Math.max(0, Math.min(window.innerHeight, viewport.height))}px`);
    assistant.style.setProperty('--assistant-viewport-top', `${Math.max(0, viewport.offsetTop)}px`);
  }
  const reception = document.querySelector('.reception-status');
  const localTime = document.getElementById('local-time');
  const themeChoices = [...document.querySelectorAll('[data-theme-mode]')];
  const themePicker = document.getElementById('theme-picker');
  const themeToggle = document.getElementById('theme-toggle');
  const themeMoon = document.getElementById('theme-moon');
  const themeSun = document.getElementById('theme-sun');
  const roadmapSteps = [...document.querySelectorAll('[data-roadmap-open]')];
  const roadmapDialog = document.getElementById('roadmap-dialog');
  const roadmapTitle = document.getElementById('roadmap-dialog-title');
  const roadmapStatus = document.getElementById('roadmap-dialog-status');
  const roadmapCopy = document.getElementById('roadmap-dialog-copy');
  const roadmapClose = document.getElementById('roadmap-dialog-close');
  const portfolioSearch = document.getElementById('portfolio-search');
  const portfolioSearchCount = document.getElementById('portfolio-search-count');
  const portfolioEntries = [...document.querySelectorAll('[data-portfolio-entry]')];
  let activeRoadmapTrigger = null;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const systemColorScheme = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
  let themeMode = 'auto';
  function applyTheme() {
    const hour = new Date().getHours();
    const theme = themeMode === 'auto'
      ? (systemColorScheme ? (systemColorScheme.matches ? 'dark' : 'light') : (hour >= 7 && hour < 19 ? 'light' : 'dark'))
      : themeMode;
    document.body.dataset.theme = theme;
    for (const button of themeChoices) button.setAttribute('aria-pressed', String(button.dataset.themeMode === themeMode));
    if (themeMoon) themeMoon.hidden = theme !== 'dark';
    if (themeSun) themeSun.hidden = theme !== 'light';
    if (themeToggle) themeToggle.setAttribute('aria-label', `Display theme: ${themeMode === 'auto' ? 'automatic, currently ' : ''}${theme}. Open theme menu`);
    if (themeColor) themeColor.content = theme === 'light' ? '#f3f6fc' : '#080d1a';
  }
  function updateLocalTime() {
    const now = new Date();
    if (localTime) {
      localTime.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(now);
      localTime.dateTime = now.toISOString();
    }
    applyTheme();
  }
  if (reception) reception.removeAttribute('hidden');
  for (const button of themeChoices) button.addEventListener('click', () => {
    themeMode = button.dataset.themeMode;
    applyTheme();
    if (themePicker) themePicker.open = false;
    if (themeToggle) themeToggle.focus();
  });
  if (systemColorScheme) {
    const followSystemTheme = () => { if (themeMode === 'auto') applyTheme(); };
    if (typeof systemColorScheme.addEventListener === 'function') systemColorScheme.addEventListener('change', followSystemTheme);
    else if (typeof systemColorScheme.addListener === 'function') systemColorScheme.addListener(followSystemTheme);
  }
  updateLocalTime();
  window.setInterval(updateLocalTime, 60000);
  for (const step of roadmapSteps) step.addEventListener('click', () => {
    activeRoadmapTrigger = step;
    roadmapTitle.textContent = step.dataset.roadmapTitle;
    roadmapStatus.textContent = step.dataset.roadmapStatus;
    roadmapCopy.textContent = step.dataset.roadmapDetail;
    roadmapDialog.showModal();
    roadmapClose.focus();
  });
  if (roadmapDialog) roadmapDialog.addEventListener('close', () => {
    if (activeRoadmapTrigger) activeRoadmapTrigger.focus();
  });
  if (roadmapClose) roadmapClose.addEventListener('click', () => roadmapDialog.close());
  if (portfolioSearch) portfolioSearch.addEventListener('input', () => {
    const query = portfolioSearch.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const entry of portfolioEntries) {
      const matches = entry.textContent.toLocaleLowerCase().includes(query);
      entry.closest('.portfolio-catalog-item').hidden = !matches;
      if (matches) visible += 1;
    }
    if (portfolioSearchCount) portfolioSearchCount.textContent = `${visible} of ${portfolioEntries.length} repository records`;
  });
  function project(key, updateHistory = true, moveFocus = false) {
    if (!views.has(key)) key = 'home';
    const changed = document.body.dataset.projection !== key;
    const view = views.get(key);
    if (surfaceContent.children.length !== 1 || surfaceContent.firstElementChild !== view) surfaceContent.replaceChildren(view);
    const heading = view.querySelector('h1');
    if (moveFocus && document.activeElement !== heading) heading.focus();
    document.body.dataset.projection = key;
    document.body.dataset.ambientProfile = profiles[key] || 'quiet';
    if (ambient) ambient.dataset.profile = profiles[key] || 'quiet';
    for (const item of navItems) {
      if (!item.matches('.navigation-link')) continue;
      if (item.dataset.senseuiProjection === key) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
    document.title = pageTitles[key] || pageTitles.home;
    if (metaDescription) metaDescription.content = pageDescriptions[key] || pageDescriptions.home;
    if (updateHistory && (changed || location.hash !== `#${key}`)) history.pushState({ projection: key }, '', `#${key}`);
  }
  function siteMatches(query) {
    const terms = [...new Set(query.toLocaleLowerCase().match(/[a-z0-9]{2,}/g) || [])];
    const matches = [];
    for (const [key, view] of views) {
      const title = view.querySelector('h1')?.textContent.trim() || pageTitles[key] || key;
      const nodes = [...view.querySelectorAll('h1, h2, h3, p, li, button, [data-project-search]')];
      let pageScore = 0;
      const excerpts = [];
      for (const node of nodes) {
        const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const lower = text.toLocaleLowerCase();
        const score = terms.reduce((count, term) => count + (lower.includes(term) ? 1 : 0), 0);
        if (score) {
          pageScore += score;
          excerpts.push({score, text: text.slice(0, 420)});
        }
      }
      if (pageScore) {
        excerpts.sort((left, right) => right.score - left.score);
        matches.push({key, title, score: pageScore, excerpts: excerpts.slice(0, 4).map(item => item.text)});
      }
    }
    return matches.sort((left, right) => right.score - left.score);
  }
  function collectSiteContext(query) {
    const pages = [...views.keys()].map(key => ({key, title: pageTitles[key], description: pageDescriptions[key]}));
    const matchingSections = [];
    let used = 0;
    for (const match of siteMatches(query)) {
      for (const excerpt of match.excerpts) {
        const section = {page: match.key, title: match.title, excerpt};
        const size = JSON.stringify(section).length;
        if (used + size > 10500) break;
        matchingSections.push(section);
        used += size;
      }
      if (used > 10500) break;
    }
    return JSON.stringify({sitePages: pages, matchingSections});
  }
  function showSiteSearchResults(query) {
    assistantActions.replaceChildren();
    const matches = siteMatches(query).slice(0, 6);
    if (matches.length === 0) {
      const empty = document.createElement('span');
      empty.textContent = 'No matching site sections were found.';
      assistantActions.append(empty);
    } else {
      for (const match of matches) {
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'assistant-action';
        link.dataset.senseuiProjection = match.key;
        link.textContent = 'Open ' + match.title + ' · ' + match.excerpts[0].slice(0, 110);
        assistantActions.append(link);
      }
    }
    assistantActions.hidden = false;
  }
  function fromLocation() { return location.hash.slice(1) || 'home'; }
  function setAssistant(open) {
    if (open) {
      if (!assistant.open) assistant.showModal();
      trigger.setAttribute('aria-expanded', 'true');
      syncAssistantViewport();
      window.requestAnimationFrame(() => {
        question.focus({preventScroll: true});
        resizeAssistantComposer();
        assistantThread.scrollTop = assistantThread.scrollHeight;
      });
      return;
    }
    if (assistant.open) assistant.close();
    trigger.setAttribute('aria-expanded', 'false');
    assistant.style.removeProperty('--assistant-viewport-height');
    assistant.style.removeProperty('--assistant-viewport-top');
    trigger.focus();
  }
  clearConversation.addEventListener('click', () => {
    if (assistantBusy) return;
    assistantConversation.length = 0;
    assistantMessages.replaceChildren(assistantEmptyState);
    assistantEmptyState.hidden = false;
    assistantEmptyState.textContent = 'Conversation cleared. What would you like to talk about?';
    assistantStatus.textContent = 'Conversation cleared.';
    latestQuestion = '';
    latestReply = '';
    question.value = '';
    resizeAssistantComposer();
    assistantActions.replaceChildren();
    assistantActions.hidden = true;
    emailReply.hidden = true;
    whatsappReply.hidden = true;
    requestDetails.hidden = true;
    requestDetails.open = false;
    requestForm.reset();
    updateRequestType();
    question.focus();
  });
  assistant.addEventListener('cancel', event => {
    event.preventDefault();
    setAssistant(false);
  });
  assistant.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    assistant.style.removeProperty('--assistant-viewport-height');
    assistant.style.removeProperty('--assistant-viewport-top');
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncAssistantViewport);
    window.visualViewport.addEventListener('scroll', syncAssistantViewport);
    window.addEventListener('resize', syncAssistantViewport, {passive: true});
  }
  question.addEventListener('input', resizeAssistantComposer);
  question.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (assistantForm.requestSubmit) assistantForm.requestSubmit();
    }
  });
  function assistantFocusableElements() {
    return [...assistant.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.closest('[hidden], [inert]') && element.getClientRects().length > 0);
  }
  assistant.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = assistantFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      assistant.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !assistant.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !assistant.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });
  function updateRequestType() {
    const route = requestType.value;
    requestEmailField.hidden = route !== 'email';
    requestPhoneField.hidden = route !== 'callback';
    requestEmail.required = route === 'email';
    requestPhone.required = route === 'callback';
    requestEmail.value = '';
    requestPhone.value = '';
    requestStatus.hidden = true;
    requestHandoff.hidden = true;
  }
  requestType.addEventListener('change', updateRequestType);
  requestForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!requestForm.reportValidity()) return;
    const route = requestType.value;
    const kind = route === 'callback' ? 'Callback request' : route === 'email' ? 'Email reply request' : 'General question';
    const details = ['DarkBlaze Group website request', '', `Request type: ${kind}`, requestEmail.value ? `Visitor reply email: ${requestEmail.value.trim()}` : '', requestPhone.value ? `Visitor phone: ${requestPhone.value.trim()}` : '', `\nVisitor question:\n${latestQuestion}`, `\nSite Secretary prepared response:\n${latestReply}`, '\nPrepared by the visitor. Review and send from your email app.'].filter(Boolean).join('\n');
    requestHandoff.href = `mailto:admin@darkblaze.org?subject=${encodeURIComponent(`DarkBlaze website: ${kind.toLowerCase()}`)}&body=${encodeURIComponent(details)}`;
    requestHandoff.hidden = false;
    requestStatus.textContent = 'Draft prepared. Choose the review link, check the recipient and message, then send it yourself. No confirmation is sent automatically.';
    requestStatus.hidden = false;
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-senseui-projection], [data-senseui-ai-toggle], [data-senseui-ai-close]');
    if (!target) return;
    if (target.hasAttribute('data-senseui-projection')) {
      event.preventDefault(); project(target.dataset.senseuiProjection, true, true);
    } else if (target.hasAttribute('data-senseui-ai-toggle')) setAssistant(!assistant.open);
    else setAssistant(false);
  });
  window.addEventListener('hashchange', () => {
    if (location.hash === '#surface-content') return;
    project(fromLocation(), false, true);
  });
  async function sendAssistantMessage() {
    if (assistantBusy) return;
    latestQuestion = question.value.trim();
    if (!latestQuestion) return;
    const prompt = latestQuestion.toLowerCase();
    const normalizedPrompt = ` ${prompt.replace(/[^a-z0-9]+/g, ' ').trim()} `;
    let preparedReply = preparedReplies.find(entry =>
      entry.phrases.some(phrase => prompt.includes(phrase)) ||
      entry.words.some(word => normalizedPrompt.includes(` ${word} `)));
    const isFollowUp = /^(and |what about |tell me more|more about|can you explain|how does that|what does that|why is that|does it |is it |that )/.test(prompt);
    if (!preparedReply && isFollowUp) {
      const previousTopic = [...assistantConversation].reverse().find(turn => turn.role === 'user');
      if (previousTopic) {
        const previousPrompt = previousTopic.content.toLowerCase();
        const normalizedPrevious = ` ${previousPrompt.replace(/[^a-z0-9]+/g, ' ').trim()} `;
        preparedReply = preparedReplies.find(entry =>
          entry.phrases.some(phrase => previousPrompt.includes(phrase)) ||
          entry.words.some(word => normalizedPrevious.includes(` ${word} `)));
      }
    }
    const userMessage = appendAssistantMessage('user', latestQuestion).article;
    const assistantMessage = appendAssistantMessage('assistant', 'Preparing a reply…').article;
    assistantMessage.classList.add('is-pending');
    const reply = assistantMessage.querySelector('.assistant-message-copy');
    const conversation = assistantConversation.slice(-8);
    let completed = false;
    question.value = '';
    resizeAssistantComposer();
    assistantActions.replaceChildren();
    assistantActions.hidden = true;
    assistantStatus.textContent = 'Your message was sent. The Site Secretary is preparing a reply.';
    assistantBusy = true;
    assistantSubmit.disabled = true;
    clearConversation.disabled = true;
    if (SITE_AI_ENDPOINT) {
      setAiStatus('checking', 'Live AI is preparing a reply');
      reply.textContent = 'Searching this site for relevant context…';
      const result = await requestSiteAssistant(latestQuestion, document.body.dataset.projection || 'home', collectSiteContext(latestQuestion), conversation, streamedReply => {
        const follow = assistantIsNearBottom();
        reply.textContent = streamedReply;
        if (follow) assistantThread.scrollTop = assistantThread.scrollHeight;
      });
      if (result.ok) {
        setAiStatus('ready', 'Live AI responded successfully');
        latestReply = result.data.reply;
        reply.textContent = latestReply;
        dispatchSiteAssistantActions(result.data.actions, {
          navigate: page => project(page, true, true),
          searchProjects: query => {
            project('about', true, false);
            const input = document.getElementById('portfolio-search');
            if (input) {
              input.value = query;
              input.dispatchEvent(new Event('input', {bubbles: true}));
              input.scrollIntoView({behavior: 'smooth', block: 'center'});
              input.focus({preventScroll: true});
            }
          },
          searchSite: showSiteSearchResults
        });
        assistantConversation.push({role: 'user', content: latestQuestion}, {role: 'assistant', content: latestReply});
        completed = true;
      } else {
        setAiStatus('offline', 'Live AI did not respond; retry your message');
        latestReply = preparedReply
          ? `${preparedReply.response} I couldn’t reach the live assistant just now, so I’ve shared information available on this site.`
          : 'I couldn’t reach the live assistant just now. Please check your connection and try again. Your message is still in the composer.';
        reply.textContent = latestReply;
        if (preparedReply) {
          assistantConversation.push({role: 'user', content: latestQuestion}, {role: 'assistant', content: latestReply});
          completed = true;
        } else {
          question.value = latestQuestion;
          const retry = document.createElement('button');
          retry.type = 'button';
          retry.className = 'assistant-retry';
          retry.textContent = 'Try again';
          retry.setAttribute('aria-label', 'Retry sending your last message');
          retry.addEventListener('click', () => {
            userMessage.remove();
            assistantMessage.remove();
            question.value = latestQuestion;
            resizeAssistantComposer();
            question.focus();
          }, {once: true});
          assistantMessage.append(retry);
        }
      }
    } else {
      setAiStatus('local', 'Prepared site responses are active; no live model request was made');
      latestReply = preparedReply
        ? preparedReply.response
        : 'Thanks for asking. This preview does not have a live model connected yet, so I can answer from prepared site and project information. I can still help you explore the projects, roadmap, privacy notice, or contact options.';
      reply.textContent = latestReply;
      assistantConversation.push({role: 'user', content: latestQuestion}, {role: 'assistant', content: latestReply});
      completed = true;
    }
    assistantMessage.classList.remove('is-pending');
    assistantStatus.textContent = completed ? 'Site Secretary replied.' : 'The live reply failed. You can retry the message.';
    assistantBusy = false;
    assistantSubmit.disabled = false;
    clearConversation.disabled = false;
    emailReply.href = `mailto:admin@darkblaze.org?subject=${encodeURIComponent(SITE_AI_ENDPOINT ? 'DarkBlaze website assistant reply' : 'DarkBlaze website prepared reply')}&body=${encodeURIComponent(`Visitor question:\n${latestQuestion}\n\nSite Secretary response:\n${latestReply}`)}`;
    whatsappReply.href = `https://wa.me/27847768997?text=${encodeURIComponent(latestReply)}`;
    emailReply.hidden = !completed;
    whatsappReply.hidden = !completed;
    requestDetails.hidden = !completed;
    updateRequestType();
    assistantThread.scrollTop = assistantThread.scrollHeight;
  }
  assistantForm.addEventListener('submit', event => {
    event.preventDefault();
    sendAssistantMessage();
  });
  const search = document.getElementById('project-search');
  if (search) search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    const projects = [...document.querySelectorAll('[data-project-search]')];
    let visible = 0;
    for (const project of projects) {
      const match = !query || project.dataset.projectSearch.includes(query);
      project.hidden = !match;
      if (match) visible++;
    }
    document.getElementById('project-search-status').textContent = query ? `Showing ${visible} matching project${visible === 1 ? '' : 's'}.` : `Showing all ${projects.length} repository records.`;
  });
  project(fromLocation(), false);
})();
