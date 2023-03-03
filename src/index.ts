import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";

const app = new Hono<{ Bindings: Bindings }>();

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
};

app.get("/", async (c) => {
  return c.redirect(" REDIRECT URL ");
});

app.get("/:url", async (c) => {
  const { url } = c.req.param();

  const client = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

  const cookie = c.req.cookie("Redirects");

  const cookieName = `clicks_${url}`;
  const cookieValue = "clicked";
  const cookieMaxAge = 60 * 60 * 24 * 365; 
  const path = "/";

  const headers = new Headers();

  headers.append(
    "Set-Cookie",
    `${cookieName}=${cookieValue}; Max-Age=${cookieMaxAge}; Path=/; SameSite=Lax;`
  );

  const responseInit = {
    headers,
    status: 200,
    statusText: "OK",
  };

  if (!cookie) {
    const { data, error } = await client
      .from("short_links")
      .select("*")
      .eq("shortened_url", url)
      .single();

    if (error) {
      return c.json({ error: error.message, url: url }, 500);
    }

    if (!data) {
      return c.json({ error: "Not found", url: url }, 404);
    }

    if (c.req.headers.has("Cookie")) {
      const cookies = c.req.headers.get("Cookie")!;
      if (cookies.includes(`${cookieName}=${cookieValue}`)) {
        return c.redirect("REDIRECT DOMAIN" + data.redirect_url);
      }
    }

    const newClicks = data.clicks + 1;
    await client
      .from("short_links")
      .update({ clicks: newClicks })
      .eq("shortened_url", url);

    c.res = new Response(null, responseInit);
  }

  const { data, error } = await client
    .from("short_links")
    .select("*")
    .eq("shortened_url", url)
    .single();

  if (error) {
    return c.json({ error: error.message, url: url }, 500);
  }

  if (!data) {
    return c.json({ error: "Not found", url: url }, 404);
  }

  return c.redirect( data.redirect_url);
});

export default app;
