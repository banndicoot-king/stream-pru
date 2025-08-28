const fs = require("fs");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const express = require("express");

const app = express();

// Create HTTPS server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.use(express.json());

let streams = {}; // { streamId: { name, listeners: Set() } }
let users = {}; // { userId: { name } }

var room_send = [];

// WebSocket Authentication Middleware
function authenticate(req) {
  const authHeader = req.headers["authorization"] || "";
  var url_auth = req.url;
  if (url_auth.includes("?")) {
    console.log("url_auth", url_auth);
    url_auth = url_auth.split("?")[1];
    var key = url_auth.split("=")[0];
    var value = url_auth.split("=")[1];

    if (key == "ptpl" && value == "Ptpl123") {
      return true;
    }
  }

  // 1. Basic Authentication
  if (authHeader.startsWith("Basic ")) {
    console.log("authHeader", authHeader);
    //   const base64Credentials = authHeader.split(" ")[1];
    //   const credentials = Buffer.from(base64Credentials, "base64").toString(
    //     "utf8"
    //   );
    //   const [username, password] = credentials.split(":");
    //   if (AUTH_USERS[username] && AUTH_USERS[username] === password) {
    return true;
    //   }
  }

  // 2. Bearer Token Authentication
  if (authHeader.startsWith("Bearer ")) {
    console.log("authHeader", authHeader);
    //   const token = authHeader.split(" ")[1];
    //   if (BEARER_TOKENS.includes(token)) {
    return true;
    //   }
  }

  // 3. Custom Header Authentication

  console.log(req.headers);
  return true;
}
var buffer = [];

wss.on("connection", (ws, req) => {
  if (!authenticate(req)) {
    console.log("Unauthorized");
    ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
    ws.close();
    return;
  } else {
    console.log("Authorized");
  }

  ws.on("message", async (message) => {
    try {
      var m;

      try {
        m = JSON.parse(message.toString() || message);
      } catch (error) {
        return;
      }

      var event = m?.event || "";
      event = String(event).toLowerCase();

      var events = {
        start: start,
        stop: stop,
        "register-user": registerUser,
        "join-room": joinRoom,
        "leave-room": leaveRoom,
        media: handleMedia,
      };

      var currentEventHandler = events[event];

      if (currentEventHandler) {
        await currentEventHandler(m);
      } else {
        console.log("Unknown event:", event);
      }

      async function start(msg) {
        var start_v = msg?.start || {};
        var {
          call_id,
          room_id,
          cli,
          dni,
          media_format = {},
          custom_parameters = [],
        } = start_v;

        streams[room_id] = {
          name: room_id,
          id: room_id,
          call_id,
          room_id,
          listeners: new Set(),
          cli,
          dni,
          media_format,
          custom_parameters,
        };

        streams[room_id].listeners.add(ws);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client !== ws) {
            client.send(
              JSON.stringify({
                type: "add-stream",
                stream: [{ name: room_id, room_id }],
              })
            );
          }
        });
      }

      async function registerUser(data) {
        const { id, name } = data;
        users[ws] = { name, id };

        if (!id || !name) {
          console.log("Invalid user data");
          return;
        }

        const streamList =
          Object.keys(streams).map((id) => ({
            id,
            name: streams[id].name,
          })) || [];
        ws.send(JSON.stringify({ event: "add-stream", stream: streamList }));

        users[ws] = { id, name };
      }

      async function joinRoom(msg) {
        const { room_id } = msg;
        if (!room_id) {
          console.log("Invalid room ID");
          return;
        }

        for (const streamId in streams) {
          streams[streamId].listeners.delete(ws);
        }
        if (streams[room_id]) {
          streams[room_id].listeners.add(ws);
        }
        ws.send(JSON.stringify({ event: "joined-room", room_id: room_id }));
      }

      async function leaveRoom(msg) {
        const { room_id } = msg;
        if (!room_id) {
          console.log("Invalid room ID");
          return;
        }

        if (streams[room_id]) {
          streams[room_id].listeners.delete(ws);
        }
        ws.send(JSON.stringify({ event: "left-room", room_id: room_id }));
      }

      async function stop(msg) {
        var stop_v = msg?.stop || {};
        var { reason } = stop_v;
        var room_id = msg?.room_id;

        if (streams[room_id]) {
          delete streams[room_id];
        }

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client !== ws) {
            // delete from the room

            client.send(
              JSON.stringify({
                type: "remove-stream",
                room_id,
                reason,
                data: msg,
              })
            );
          }
        });
      }

      async function handleMedia(msg) {
        const roomId = Object.keys(streams).find((roomId) =>
          streams[roomId].listeners.has(ws)
        );

        if (roomId) {
          const listeners = Array.from(streams[roomId]?.listeners || []);
          listeners.forEach((listenerWs) => {
            if (listenerWs.readyState === WebSocket.OPEN && listenerWs !== ws) {
              //listenerWs.send(message);
              listenerWs.send(
                JSON.stringify({
                  event: "media",
                  media: {
                    ...msg.media,
                    media_format: streams[roomId]?.media_format,
                  },
                })
              );
            }
          });
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Error processing message" })
      );
    }
  });

  ws.on("close", () => {
    buffer = [];
    const user = users[ws];
    if (user) {
      delete users[ws];
      for (const streamId in streams) {
        streams[streamId].listeners.delete(ws);
      }

      for (const streamId in streams) {
        if (streams[streamId].listeners.size === 0) {
          delete streams[streamId];
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              // delete from the room

              client.send(
                JSON.stringify({
                  type: "remove-stream",
                  stream: [{ room_id: streamId }],
                })
              );
            }
          });
        }
      }
    }
  });
});

wss.on("error", (err) => {
  console.error("WebSocket error:", err);
});
wss.on("close", () => {
  console.log("WebSocket connection closed");
});

const PORT = 3031;

app.post("/audio/:id", (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Missing 'id' in request body" });
  }

  if (room_send.includes(id)) {
    return res.status(400).json({ message: "Already streaming" });
  }

  room_send.push(id);
  // connect(id)
  //   .then(() => {
  res.status(200).json({ message: "Audio streaming started" });
  // })
  // .catch((err) => {
  //   console.error("Error starting audio streaming:", err);
  //   res.status(500).json({ message: "Failed to start audio streaming" });
  // });
});

app.delete("/audio/:id", (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Missing 'id' in request body" });
  }

  if (!room_send.includes(id)) {
    return res.status(400).json({ message: "Not streaming" });
  }

  room_send = room_send.filter((room) => room !== id);
  res.status(200).json({ message: "Audio streaming stopped" });
});

server.listen(PORT, () => {
  const ips = require("os").networkInterfaces();

  const ip = Object.keys(ips)
    .map((key) => {
      return ips[key].map((ip) => ip.address);
    })
    .flat()
    .filter((ip) => ip.includes("."));
  ip.forEach((ip) => {
    console.log(`HTTP Server running on http://${ip}:${PORT}`);
  });
});
