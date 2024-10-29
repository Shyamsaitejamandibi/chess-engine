import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager";
import url from "url";
import { extractAuthUser } from "./auth";
import { User } from "./SocketManager";

const wss = new WebSocketServer({ port: 8080 });

const gameManager = new GameManager();

wss.on("connection", function connection(ws, req) {
  const token: string = req.url
    ? (url.parse(req.url, true).query.token as string)
    : "";
  const user = extractAuthUser(token, ws);
  gameManager.addUser(user);

  console.log(`New user connected: ${user.userId} (${user.name})`);
  ws.on("close", () => {
    gameManager.removeUser(ws);
  });
});

console.log("done");

// // Mock JWT Claims (dummy data for testing)
// const dummyUserJwtClaims1 = {
//   userId: "dummyUser123",
//   name: "Dummy User 1",
//   isGuest: true,
// };

// const dummyUserJwtClaims2 = {
//   userId: "dummyUser456",
//   name: "Dummy User 2",
//   isGuest: true,
// };

// wss.on("connection", function connection(ws, req) {
//   const token = url.parse(req.url!, true).query.token as string;
//   if (!token) {
//     ws.send(
//       JSON.stringify({
//         type: "error",
//         message: "No token provided.",
//       })
//     );
//     ws.close();
//     return;
//   }

//   // Choose dummy JWT claims based on the token (or any custom logic)
//   const dummyUserJwtClaims =
//     token === "token1" ? dummyUserJwtClaims1 : dummyUserJwtClaims2;

//   const user = new User(ws, dummyUserJwtClaims);
//   console.log(`New user connected: ${user.userId} (${user.name})`);

//   gameManager.addUser(user);

//   ws.on("close", () => {
//     gameManager.removeUser(ws);
//     console.log(`User disconnected: ${user.userId}`);
//   });
// });
