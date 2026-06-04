(function () {
  const { detainees, seedMessages } = window.SupportSiteData;
  const api = window.SupportSiteApi;
  const storage = window.SupportSiteStorage;
  const config = window.SupportSiteConfig || {};
  const MAX_SMALL_HUG = 5;
  const SHOW_PUBLIC_MESSAGES = config.showPublicMessages === true;

  const state = {
    connectionError: "",
    isRemote: false,
    isSubmitting: false,
    selectedId: null,
    messages: [],
  };

  const els = {
    detaineeGrid: document.getElementById("detaineeGrid"),
    selectedIndicator: document.getElementById("selectedIndicator"),
    supportForm: document.getElementById("supportForm"),
    connectionStatus: document.getElementById("connectionStatus"),
    senderName: document.getElementById("senderName"),
    donationAmount: document.getElementById("donationAmount"),
    messageText: document.getElementById("messageText"),
    successMsg: document.getElementById("successMsg"),
    messagesList: document.getElementById("messagesList"),
    copyAllBtn: document.getElementById("copyAllBtn"),
    statDetainees: document.getElementById("statDetainees"),
    statMessages: document.getElementById("statMessages"),
    statDonations: document.getElementById("statDonations"),
    supportPanel: document.getElementById("tab-support"),
    messagesPanel: document.getElementById("tab-messages"),
    tabButtons: document.querySelectorAll("[data-tab-button]"),
  };

  function applyFeatureFlags() {
    const messagesButton = document.querySelector('[data-tab-button="messages"]');

    if (SHOW_PUBLIC_MESSAGES) {
      if (messagesButton) messagesButton.hidden = false;
      els.messagesPanel.hidden = els.supportPanel.hidden === false;
      return;
    }

    if (messagesButton) messagesButton.hidden = true;
    els.messagesPanel.hidden = true;
    els.supportPanel.hidden = false;

    els.tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tabButton === "support");
    });
  }

  function formatCurrency(value) {
    return `₪${Number(value || 0).toLocaleString("he-IL")}`;
  }

  function formatDate(isoDate) {
    return new Intl.DateTimeFormat("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(isoDate));
  }

  function createTextNodeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function getAccountLines(detainee) {
    return [
      `שם: ${detainee.name}`,
      `בנק: ${detainee.bank.name}`,
      `סניף: ${detainee.bank.branch}`,
      `חשבון: ${detainee.bank.account}`,
      `על שם: ${detainee.bank.holder}`,
    ];
  }

  function copyWithFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.inset = "-9999px auto auto -9999px";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }

  async function copyText(text, button) {
    try {
      try {
        if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(text);
      } catch {
        if (!copyWithFallback(text)) throw new Error("Fallback copy failed");
      }

      const originalText = button.textContent;
      button.textContent = "הועתק";
      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1400);
    } catch (error) {
      console.error("Could not copy account details", error);
      window.alert("לא הצלחנו להעתיק כרגע. אפשר לסמן ולהעתיק ידנית.");
    }
  }

  function createCopyButton(label, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-account-btn";
    button.textContent = label;
    button.addEventListener("click", () => copyText(text, button));
    return button;
  }

  function getDonationTotalForDetainee(detaineeId) {
    return state.messages
      .filter((message) => message.detaineeId === detaineeId && message.donation > 0)
      .reduce((sum, message) => sum + message.donation, 0);
  }

  function renderDetainees() {
    els.detaineeGrid.replaceChildren();

    detainees.forEach((detainee) => {
      const card = document.createElement("article");
      card.className = `detainee-card${state.selectedId === detainee.id ? " selected" : ""}`;

      const intro = document.createElement("div");
      intro.append(createTextNodeElement("h3", "detainee-name", detainee.name), createTextNodeElement("p", "detainee-note", detainee.note));

      const bankInfo = document.createElement("div");
      bankInfo.className = "bank-info";
      bankInfo.append(
        createTextNodeElement("div", "label", "פרטי חשבון להשתתפות"),
        createTextNodeElement("div", "value", detainee.bank.name),
        createTextNodeElement("div", "account-line", `סניף: ${detainee.bank.branch}`),
        createTextNodeElement("div", "account-line", `חשבון: ${detainee.bank.account}`),
        createTextNodeElement("div", "account-line", `על שם: ${detainee.bank.holder}`)
      );

      const actions = document.createElement("div");
      actions.className = "detainee-actions";

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "select-detainee-btn";
      selectButton.textContent = state.selectedId === detainee.id ? "נבחר" : "בחר לחיזוק";
      selectButton.setAttribute("aria-pressed", state.selectedId === detainee.id ? "true" : "false");
      selectButton.addEventListener("click", () => selectDetainee(detainee.id));

      const copyActions = document.createElement("div");
      copyActions.className = "copy-account-actions";
      copyActions.append(
        createCopyButton("העתק בנק", detainee.bank.name),
        createCopyButton("העתק סניף", detainee.bank.branch),
        createCopyButton("העתק חשבון", detainee.bank.account),
        createCopyButton("העתק על שם", detainee.bank.holder),
        createCopyButton("העתק הכל", getAccountLines(detainee).join("\n"))
      );

      actions.append(selectButton, copyActions);
      card.append(intro, bankInfo, actions);

      const donationTotal = getDonationTotalForDetainee(detainee.id);
      if (donationTotal > 0) {
        card.append(createTextNodeElement("div", "donation-badge", `${formatCurrency(donationTotal)} נשלחו כחיבוק קטן`));
      }

      els.detaineeGrid.append(card);
    });
  }

  function selectDetainee(id) {
    const detainee = detainees.find((item) => item.id === id);
    if (!detainee) return;

    state.selectedId = id;
    els.selectedIndicator.textContent = `נבחר: ${detainee.name}`;
    els.selectedIndicator.hidden = false;
    renderDetainees();
  }

  function normalizeDonation(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.min(MAX_SMALL_HUG, Math.round(number));
  }

  function setConnectionStatus() {
    if (state.isRemote) {
      els.connectionStatus.hidden = true;
      return;
    }

    els.connectionStatus.hidden = false;

    if (api.hasRemoteConnection && state.connectionError) {
      els.connectionStatus.className = "connection-status local-only";
      els.connectionStatus.textContent = "יש כרגע תקלה בשליחת הודעות. נסו שוב בעוד כמה דקות.";
      return;
    }

    els.connectionStatus.className = "connection-status local-only";
    els.connectionStatus.textContent = "יש כרגע תקלה בשליחת הודעות. נסו שוב בעוד כמה דקות.";
  }

  async function loadMessages() {
    try {
      const result = await api.listMessages();
      state.isRemote = result.mode === "remote";
      state.connectionError = "";
      state.messages = state.isRemote ? result.messages : storage.readMessages(seedMessages);
    } catch (error) {
      console.error("Could not load shared messages", error);
      state.isRemote = false;
      state.connectionError = error.message || "remote connection failed";
      state.messages = storage.readMessages(seedMessages);
    }

    setConnectionStatus();
    renderAll();
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (state.isSubmitting) return;

    if (!state.selectedId) {
      window.alert("נא לבחור עצור תחילה");
      return;
    }

    const text = els.messageText.value.trim();
    if (!text) {
      window.alert("נא לכתוב מסר חיזוק");
      return;
    }

    if (Number(els.donationAmount.value) > MAX_SMALL_HUG) {
      window.alert("החיבוק הקטן מוגבל עד 5 ש״ח.");
      return;
    }

    const detainee = detainees.find((item) => item.id === state.selectedId);
    const message = {
      id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `msg-${Date.now()}`,
      detaineeId: detainee.id,
      detaineeName: detainee.name,
      sender: els.senderName.value.trim() || "אנונימי",
      text,
      donation: normalizeDonation(els.donationAmount.value),
      createdAt: new Date().toISOString(),
    };

    try {
      state.isSubmitting = true;
      els.supportForm.querySelector(".submit-btn").disabled = true;
      const result = await api.createMessage(message);
      state.isRemote = result.mode === "remote";
      state.messages.push(result.message);

      if (!state.isRemote) {
        storage.writeMessages(state.messages);
      }

      els.supportForm.reset();
      els.successMsg.textContent = "ההודעה נשלחה ותופיע באתר.";
      els.successMsg.hidden = false;
      window.setTimeout(() => {
        els.successMsg.hidden = true;
      }, 3200);

      setConnectionStatus();
      renderAll();
      if (SHOW_PUBLIC_MESSAGES) {
        showTab("messages");
      }
    } catch (error) {
      console.error("Could not save support message", error);
      window.alert("לא הצלחנו לשלוח את ההודעה כרגע. נסו שוב בעוד כמה דקות.");
    } finally {
      state.isSubmitting = false;
      els.supportForm.querySelector(".submit-btn").disabled = false;
    }
  }

  function updateStats() {
    const totalDonations = state.messages.reduce((sum, message) => sum + message.donation, 0);
    els.statDetainees.textContent = detainees.length;
    els.statMessages.textContent = state.messages.length;
    els.statDonations.textContent = formatCurrency(totalDonations);
  }

  function renderMessages() {
    if (!SHOW_PUBLIC_MESSAGES) return;

    els.messagesList.replaceChildren();

    if (!state.messages.length) {
      els.messagesList.append(createTextNodeElement("div", "empty-state", "עדיין לא נכתבו הודעות חיזוק"));
      return;
    }

    [...state.messages].reverse().forEach((message) => {
      const item = document.createElement("article");
      item.className = "message-item";

      const header = document.createElement("div");
      header.className = "msg-header";
      header.append(
        createTextNodeElement("span", "msg-sender", message.sender),
        createTextNodeElement("span", "msg-target", `ל${message.detaineeName}`),
        createTextNodeElement("span", "msg-date", formatDate(message.createdAt))
      );

      item.append(header, createTextNodeElement("div", "msg-text", message.text));

      if (message.donation > 0) {
        item.append(createTextNodeElement("div", "msg-donation", `חיבוק קטן: ${formatCurrency(message.donation)}`));
      }

      els.messagesList.append(item);
    });
  }

  function copyAllMessages() {
    if (!state.messages.length) {
      window.alert("אין הודעות להעתקה");
      return;
    }

    const text = state.messages
      .map((message) => {
        const donation = message.donation > 0 ? `\nחיבוק קטן: ${formatCurrency(message.donation)}` : "";
        return `--- ${message.detaineeName} | מ: ${message.sender} | ${formatDate(message.createdAt)} ---\n${message.text}${donation}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(text).then(() => window.alert("הועתק"));
  }

  function showTab(tabName) {
    if (tabName === "messages" && !SHOW_PUBLIC_MESSAGES) {
      tabName = "support";
    }

    const isSupport = tabName === "support";
    els.supportPanel.hidden = !isSupport;
    els.messagesPanel.hidden = isSupport;

    els.tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tabButton === tabName);
    });
  }

  function renderAll() {
    updateStats();
    renderDetainees();
    renderMessages();
  }

  els.supportForm.addEventListener("submit", submitMessage);
  els.copyAllBtn.addEventListener("click", copyAllMessages);
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tabButton));
  });

  applyFeatureFlags();
  loadMessages();
})();
