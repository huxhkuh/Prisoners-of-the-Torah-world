(function () {
  const STORAGE_KEY = "torah-prisoners-support-messages-v1";

  function readMessages(fallbackMessages) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        writeMessages(fallbackMessages);
        return [...fallbackMessages];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [...fallbackMessages];
    } catch (error) {
      console.warn("Could not read saved support messages", error);
      return [...fallbackMessages];
    }
  }

  function writeMessages(messages) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }

  window.SupportSiteStorage = {
    readMessages,
    writeMessages,
  };
})();
