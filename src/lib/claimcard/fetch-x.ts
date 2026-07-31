import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { FetchedPost } from "./types";
import { parseXStatusUrl } from "./parse-url";
import { extractLinks } from "./infer";

/**
 * Resolve a public X/Twitter status URL into structured post data.
 * Tries fxtwitter → vxtwitter → official oEmbed (text only).
 * No API keys required. Private/deleted posts will fail with a clear error.
 */
export const resolveXPost = createServerFn({ method: "POST" })
  .validator(z.object({ url: z.string().min(3) }))
  .handler(async ({ data }): Promise<FetchedPost> => {
    const parsed = parseXStatusUrl(data.url);
    if (!parsed) {
      throw new Error(
        "That does not look like an X/Twitter post link. Paste a URL like https://x.com/user/status/123…",
      );
    }

    const errors: string[] = [];

    try {
      const fx = await fetchFxTwitter(parsed.statusId, parsed.handle);
      if (fx) return fx;
    } catch (e) {
      errors.push(`fxtwitter: ${errMsg(e)}`);
    }

    try {
      const vx = await fetchVxTwitter(parsed.statusId, parsed.handle);
      if (vx) return vx;
    } catch (e) {
      errors.push(`vxtwitter: ${errMsg(e)}`);
    }

    try {
      const oe = await fetchOEmbed(parsed.url);
      if (oe) return oe;
    } catch (e) {
      errors.push(`oembed: ${errMsg(e)}`);
    }

    throw new Error(
      [
        "Could not load that post. It may be private, deleted, or temporarily blocked.",
        "You can still paste the post text manually below.",
        errors.length ? `Details: ${errors.join(" · ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  });

async function fetchFxTwitter(
  statusId: string,
  handle?: string,
): Promise<FetchedPost | null> {
  const paths = handle
    ? [
        `https://api.fxtwitter.com/${encodeURIComponent(handle)}/status/${statusId}`,
        `https://api.fxtwitter.com/status/${statusId}`,
      ]
    : [`https://api.fxtwitter.com/status/${statusId}`];

  for (const endpoint of paths) {
    const res = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "user-agent": "LPIN-Suite-Claims/1.0",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      code?: number;
      tweet?: FxTweet;
    };
    if (json.code !== 200 || !json.tweet?.text) continue;
    return mapFxTweet(json.tweet, statusId);
  }
  return null;
}

interface FxTweet {
  url?: string;
  id?: string;
  text?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  views?: number | string;
  created_at?: string;
  lang?: string;
  community_note?: string | null;
  author?: {
    name?: string;
    screen_name?: string;
    description?: string;
    followers?: number;
  };
  quote?: {
    text?: string;
    author?: { screen_name?: string; name?: string };
    url?: string;
  };
  replying_to?: string | null;
  replying_to_status?: string | null;
  media?: {
    all?: Array<{ type?: string; altText?: string; url?: string }>;
  };
  external_urls?: string[];
}

function mapFxTweet(t: FxTweet, statusId: string): FetchedPost {
  const text = (t.text || "").trim();
  const handle = t.author?.screen_name || "";
  const mediaBits =
    t.media?.all?.map((m) => {
      if (m.altText) return m.altText;
      return m.type || "media";
    }) ?? [];
  const links = [
    ...extractLinks(text),
    ...(t.external_urls ?? []),
    ...(t.quote?.url ? [t.quote.url] : []),
  ];

  return {
    url: t.url || `https://x.com/i/web/status/${statusId}`,
    statusId: t.id || statusId,
    text,
    authorName: t.author?.name || "",
    authorHandle: handle,
    authorBio: t.author?.description || undefined,
    authorFollowers: t.author?.followers,
    postedAt: t.created_at,
    likes: t.likes,
    reposts: t.retweets,
    replies: t.replies,
    views:
      typeof t.views === "number"
        ? t.views
        : typeof t.views === "string" && /^\d+$/.test(t.views)
          ? Number(t.views)
          : undefined,
    language: t.lang,
    mediaSummary: mediaBits.length ? mediaBits.join("; ") : undefined,
    replyToHandle: t.replying_to || undefined,
    quoteText: t.quote?.text,
    quoteHandle: t.quote?.author?.screen_name,
    communityNote: t.community_note || undefined,
    externalLinks: [...new Set(links)],
    fetchSource: "fxtwitter",
  };
}

async function fetchVxTwitter(
  statusId: string,
  handle?: string,
): Promise<FetchedPost | null> {
  const pathHandle = handle || "i";
  const endpoint = `https://api.vxtwitter.com/${encodeURIComponent(pathHandle)}/status/${statusId}`;
  const res = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "LPIN-Suite-Claims/1.0",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const t = (await res.json()) as {
    text?: string;
    tweetID?: string;
    tweetURL?: string;
    user_name?: string;
    user_screen_name?: string;
    date?: string;
    likes?: number;
    retweets?: number;
    replies?: number;
    qrt?: { text?: string; user_screen_name?: string };
  };
  if (!t.text) return null;
  return {
    url:
      t.tweetURL?.replace("twitter.com", "x.com") ||
      `https://x.com/i/web/status/${statusId}`,
    statusId: t.tweetID || statusId,
    text: t.text.trim(),
    authorName: t.user_name || "",
    authorHandle: t.user_screen_name || handle || "",
    postedAt: t.date,
    likes: t.likes,
    reposts: t.retweets,
    replies: t.replies,
    quoteText: t.qrt?.text,
    quoteHandle: t.qrt?.user_screen_name,
    externalLinks: extractLinks(t.text),
    fetchSource: "vxtwitter",
  };
}

async function fetchOEmbed(url: string): Promise<FetchedPost | null> {
  const endpoint = `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    url?: string;
    author_name?: string;
    author_url?: string;
    html?: string;
  };
  if (!data.html) return null;

  const text = stripOEmbedHtml(data.html);
  if (!text) return null;

  let handle = "";
  try {
    if (data.author_url) {
      handle =
        new URL(data.author_url).pathname.replace(/^\//, "").split("/")[0] ||
        "";
    }
  } catch {
    /* ignore */
  }

  const parsed = parseXStatusUrl(data.url || url);

  return {
    url: data.url || url,
    statusId: parsed?.statusId || "",
    text,
    authorName: data.author_name || "",
    authorHandle: handle,
    externalLinks: extractLinks(text),
    fetchSource: "oembed",
  };
}

function stripOEmbedHtml(html: string): string {
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const inner = p?.[1] ?? html;
  return inner
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
