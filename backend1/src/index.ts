import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager";
import url from "url";
import { extractAuthUser } from "./auth";

const wss = new WebSocketServer({ port: 8080 });

const gameManager = new GameManager();

wss.on("connection", function connection(ws, req) {
  const name: string = req.url
    ? (url.parse(req.url, true).query.name as string)
    : "";

  const userId: string = req.url
    ? (url.parse(req.url, true).query.userId as string)
    : "";
  console.log("name", name);
  console.log("userId", userId);
  const user = extractAuthUser(name, ws, userId);
  gameManager.addUser(user);

  console.log(`New user connected: ${user.userId} (${user.name})`);
  ws.on("close", () => {
    gameManager.removeUser(ws);
  });
});

console.log("done");
