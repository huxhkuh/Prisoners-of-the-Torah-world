# Supabase setup

The site can run on GitHub Pages and still save shared messages by using Supabase as the public backend.

1. Create a Supabase project.
2. Open the SQL editor and run `docs/supabase-setup.sql`.
3. In Project Settings > API, copy the project URL and anon public key.
4. Paste them into `assets/js/config.js`:

```js
window.SupportSiteConfig = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_PUBLIC_KEY",
};
```

The anon key is designed to be public in browser apps. The SQL enables row level security and allows anonymous visitors to read and add messages, but not edit or delete them.
