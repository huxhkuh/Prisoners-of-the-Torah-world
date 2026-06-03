(function () {
  const { detainees, seedMessages } = window.SupportSiteData;
  const storage = window.SupportSiteStorage;

  const state = {
    selectedId: null,
    messages: storage.readMessages(seedMessages),
  };

  const els = {
    detaineeGrid: document.getElementById("detaineeGrid"),
    selectedIndicator: document.getElementById("selectedIndicator"),
    supportForm: document.getElementById("supportForm"),
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
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-pressed", state.selectedId === detainee.id ? "true" : "false");
      card.addEventListener("click", () => selectDetainee(detainee.id));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectDetainee(detainee.id);
        }
      });

      const intro = document.createElement("div");
      intro.append(
        createTextNodeElement("h3", "detainee-name", detainee.name),
        createTextNodeElement("p", "detainee-meta", `גיל ${detainee.age} · ${detainee.yeshiva} · ${detainee.city}`),
        createTextNodeElement("p", "detainee-note", detainee.note)
      );

      const bankInfo = document.createElement("div");
      bankInfo.className = "bank-info";
      bankInfo.append(
        createTextNodeElement("div", "label", "פרטי חשבון לתרומה"),
        createTextNodeElement("div", "value", detainee.bank.name),
        createTextNodeElement("div", "account-line", `חשבון: ${detainee.bank.account} | סניף: ${detainee.bank.branch}`)
      );

      card.append(intro, bankInfo);

      const donationTotal = getDonationTotalForDetainee(detainee.id);
      if (donationTotal > 0) {
        card.append(createTextNodeElement("div", "donation-badge", `${formatCurrency(donationTotal)} נתרמו`));
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
    return Math.round(number);
  }

  function submitMessage(event) {
    event.preventDefault();

    if (!state.selectedId) {
      window.alert("נא לבחור עצור תחילה");
      return;
    }

    const text = els.messageText.value.trim();
    if (!text) {
      window.alert("נא לכתוב מסר חיזוק");
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

    state.messages.push(message);
    storage.writeMessages(state.messages);
    els.supportForm.reset();
    els.successMsg.hidden = false;
    window.setTimeout(() => {
      els.successMsg.hidden = true;
    }, 3200);

    renderAll();
    showTab("messages");
  }

  function updateStats() {
    const totalDonations = state.messages.reduce((sum, message) => sum + message.donation, 0);
    els.statDetainees.textContent = detainees.length;
    els.statMessages.textContent = state.messages.length;
    els.statDonations.textContent = formatCurrency(totalDonations);
  }

  function renderMessages() {
    els.messagesList.replaceChildren();

    if (!state.messages.length) {
      els.messagesList.append(createTextNodeElement("div", "empty-state", "עדיין לא נשמרו הודעות חיזוק"));
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
        item.append(createTextNodeElement("div", "msg-donation", `תרומה: ${formatCurrency(message.donation)}`));
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
        const donation = message.donation > 0 ? `\nתרומה: ${formatCurrency(message.donation)}` : "";
        return `--- ${message.detaineeName} | מ: ${message.sender} | ${formatDate(message.createdAt)} ---\n${message.text}${donation}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(text).then(() => window.alert("הועתק"));
  }

  function showTab(tabName) {
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

  renderAll();
})();
