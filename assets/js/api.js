(function () {
  const TABLE_NAME = "support_messages";
  const config = window.SupportSiteConfig || {};

  function hasSupabaseConfig() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  }

  function createClient() {
    if (!hasSupabaseConfig()) return null;
    return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  const client = createClient();

  function fromDatabase(row) {
    return {
      id: row.id,
      detaineeId: row.detainee_id,
      detaineeName: row.detainee_name,
      sender: row.sender || "אנונימי",
      text: row.body,
      donation: Number(row.donation || 0),
      createdAt: row.created_at,
    };
  }

  function toDatabase(message) {
    return {
      detainee_id: message.detaineeId,
      detainee_name: message.detaineeName,
      sender: message.sender,
      body: message.text,
      donation: message.donation,
    };
  }

  async function listMessages() {
    if (!client) {
      return { mode: "local", messages: [] };
    }

    const { data, error } = await client
      .from(TABLE_NAME)
      .select("id,detainee_id,detainee_name,sender,body,donation,created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { mode: "remote", messages: data.map(fromDatabase) };
  }

  async function createMessage(message) {
    if (!client) {
      return { mode: "local", message };
    }

    const { data, error } = await client
      .from(TABLE_NAME)
      .insert(toDatabase(message))
      .select("id,detainee_id,detainee_name,sender,body,donation,created_at")
      .single();

    if (error) throw error;
    return { mode: "remote", message: fromDatabase(data) };
  }

  window.SupportSiteApi = {
    createMessage,
    hasRemoteConnection: Boolean(client),
    listMessages,
  };
})();
