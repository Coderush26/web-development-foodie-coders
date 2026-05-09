import { createServer } from "node:http";

import { getRequestHandlers } from "next/dist/server/lib/start-server";
import { WebSocketServer } from "ws";

import { AUTH_SESSION_COOKIE, authModeValues } from "./src/config/auth";
import { isFleetSocketPath } from "./src/lib/realtime/messages";
import { parseCookieHeader, resolveAuthModeFromCookieHeader } from "./src/server/auth/request";
import { getSessionIdentity } from "./src/server/auth/session";
import { getFleetRuntime } from "./src/server/simulation/runtime";

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";
const formattedOriginHost = hostname === "0.0.0.0" ? "localhost" : hostname;

async function main() {
  const server = createServer();

  if (dev) {
    process.env.__NEXT_DEV_SERVER = "1";
    process.env.TURBOPACK ??= "auto";
  }

  process.env.PORT = String(port);
  process.env.__NEXT_PRIVATE_ORIGIN = `http://${formattedOriginHost}:${port}`;

  const { requestHandler, upgradeHandler } = await getRequestHandlers({
    dir: process.cwd(),
    port,
    isDev: dev,
    server,
    hostname,
    onDevServerCleanup: undefined,
  });

  const runtime = getFleetRuntime();
  runtime.start();

  const socketServer = new WebSocketServer({ noServer: true });

  socketServer.on("connection", (socket) => {
    runtime.attachClient(socket);
  });

  server.on("request", (request, response) => {
    void requestHandler(request, response);
  });

  server.on("upgrade", async (request, socket, head) => {
    if (isFleetSocketPath(request.url)) {
      const authMode = resolveAuthModeFromCookieHeader(request.headers.cookie);

      if (authMode === authModeValues.enabled) {
        const sessionToken = parseCookieHeader(request.headers.cookie)[AUTH_SESSION_COOKIE];
        const session = await getSessionIdentity(sessionToken);

        if (!session) {
          socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      socketServer.handleUpgrade(request, socket, head, (webSocket) => {
        socketServer.emit("connection", webSocket, request);
      });

      return;
    }

    await upgradeHandler(request, socket, head);
  });

  server.listen(port, hostname, () => {
    console.log(`Fleet Crisis Ops server listening on http://${hostname}:${port}`);
  });
}

void main().catch((error) => {
  console.error("Failed to start Fleet Crisis Ops server.", error);
  process.exit(1);
});
