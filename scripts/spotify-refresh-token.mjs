#!/usr/bin/env node
/**
 * Mints a Spotify refresh token for the "now playing" widget.
 *
 *   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-refresh-token.mjs
 *
 * Before running, add this exact redirect URI to your app at
 * https://developer.spotify.com/dashboard  →  your app  →  Settings:
 *
 *   http://127.0.0.1:8888/callback
 *
 * Nothing is written to disk and the secret is never printed.
 */

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ["user-read-currently-playing", "user-read-recently-played"];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in the environment first."
  );
  process.exit(1);
}

const state = randomBytes(16).toString("hex");

const authorizeUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES.join(" "),
    redirect_uri: REDIRECT_URI,
    state,
    /* force the consent screen so a stale grant does not silently pass */
    show_dialog: "true",
  });

async function exchange(code) {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      `${response.status} ${body.error ?? ""} ${body.error_description ?? ""}`
    );
  }

  return body;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname !== "/callback") {
    response.writeHead(404).end("Not here.");
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    response.writeHead(400).end(`Spotify said: ${error}`);
    console.error(`\nAuthorization refused: ${error}`);
    server.close();
    process.exit(1);
  }

  if (url.searchParams.get("state") !== state) {
    response.writeHead(400).end("State mismatch.");
    console.error("\nState mismatch — start again.");
    server.close();
    process.exit(1);
  }

  try {
    const token = await exchange(url.searchParams.get("code"));

    response
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end("<h1>Done.</h1><p>Back to the terminal.</p>");

    console.log("\n  SPOTIFY_REFRESH_TOKEN=" + token.refresh_token);
    console.log("\n  Scopes granted: " + token.scope);
    console.log(
      "\n  Put that value on the server (and in .env.local for development),\n  then restart the container.\n"
    );
  } catch (failure) {
    response.writeHead(500).end("Token exchange failed. See the terminal.");
    console.error(`\nToken exchange failed: ${failure.message}`);
    process.exitCode = 1;
  }

  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\nOpen this URL, approve, and come back:\n");
  console.log("  " + authorizeUrl + "\n");
});
