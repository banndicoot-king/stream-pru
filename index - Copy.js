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

let streams = {}; // { streamId: { name, listeners: Set() } }
let users = {}; // { userId: { name } }

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

wss.on("connection", (ws, req) => {
  if (!authenticate(req)) {
    console.log("Unauthorized");
    ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
    ws.close();
    return;
  } else {
    console.log("Authorized");
  }

  async function sendAudioChunk(ws) {
    const filePath = path.join(__dirname, "audios", "Taka.wav");
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunk size
    const INTERVAL = 5000; // 5 seconds interval

    fs.open(filePath, "r", (err, fd) => {
      if (err) {
        console.error("Error opening file:", err);
        return;
      }

      let position = 0;

      const sendChunk = () => {
        const buffer = Buffer.alloc(CHUNK_SIZE);
        fs.read(fd, buffer, 0, CHUNK_SIZE, position, (err, bytesRead) => {
          if (err) {
            console.error("Error reading file:", err);
            return;
          }

          if (bytesRead > 0) {
            const chunk = buffer.slice(0, bytesRead);
            ws.send(chunk);
            position += bytesRead;
            setTimeout(sendChunk, INTERVAL);
          } else {
            fs.close(fd, (err) => {
              if (err) console.error("Error closing file:", err);
            });
          }
        });
      };

      sendChunk();
    });
  }

  ws.on("message", (message) => {
    try {
      var m;

      try {
        m = JSON.parse(message.toString() || message.toString() || message);
        // console.log("m set");
      } catch (error) {
        console.log("hit");
        // save to local
        var time = new Date().getTime().toString();
        // fs.writeFileSync(`${time}.mp3`, message);
        // return ws.send(message);
        const message2 = JSON.stringify({
          type: "audio-chunk2",
          chunk: {
            type: "buffer",
            data: Buffer.from(message).toString("base64"),
          },
        });

        const roomId = Object.keys(streams).find((roomId) =>
          streams[roomId].listeners.has(ws)
        );

        if (roomId) {
          const listeners = Array.from(streams[roomId]?.listeners || []);
          listeners.forEach((listenerWs) => {
            if (listenerWs.readyState === WebSocket.OPEN && listenerWs !== ws) {
              listenerWs.send(message2);
            }
          });
        }

        return;
      }

      if (!m) return;
      console.log("m", message.toString());
      const { type, ...data } = m;
      console.log("type", type);
      switch (type) {
        case "register-stream": {
          const { roomId, name } = data;
          streams[roomId] = { name, listeners: new Set() };
          streams[roomId].listeners.add(ws);
          // send all users to new stream name and id

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              client.send(
                JSON.stringify({
                  type: "add-stream",
                  stream: [{ roomId, name }],
                })
              );
            }
          });

          sendAudioChunk(ws);
          break;
        }

        case "register-user": {
          const { id, name } = data;
          users[ws] = { name, id };
          // send all streams to user
          const streamList =
            Object.keys(streams).map((id) => ({
              id,
              name: streams[id].name,
            })) || [];
          ws.send(JSON.stringify({ type: "add-stream", stream: streamList }));
          break;
        }

        case "join-room": {
          const { roomId } = data;
          for (const streamId in streams) {
            streams[streamId].listeners.delete(ws);
          }

          if (streams[roomId]) {
            streams[roomId].listeners.add(ws);
          }
          break;
        }

        case "leave-room": {
          for (const streamId in streams) {
            streams[streamId].listeners.delete(ws);
          }

          for (const streamId in streams) {
            if (streams[streamId].listeners.size === 0) {
              delete streams[streamId];
              ws.send(
                JSON.stringify({
                  type: "remove-stream",
                  stream: [{ roomId: streamId }],
                })
              );
            }
          }
          break;
        }

        case "all-send": {
          const bf = Buffer.from(data.chunk.data, "base64").toString("base64");
          // send the audio to all as all sockets without checking the room
          const message_ = JSON.stringify({
            type: "audio-chunk2",
            chunk: {
              type: "buffer",
              data: bf,
            },
          });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              client.send(message_);
            }
          });
        }

        case "all-send2": {
          // send the audio to all as all sockets without checking the room
          const message_ = JSON.stringify({
            type: "audio-chunk3",
            ...data,
          });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              client.send(message_);
            }
          });
        }
        case "test-audio": {
          try {
            const roomId = Object.keys(streams).find((roomId) =>
              streams[roomId].listeners.has(ws)
            );

            if (!roomId) {
              ws.send(
                JSON.stringify({ type: "error", message: "Not in a room" })
              );
              return;
            } else {
              const message_ = JSON.stringify({
                type: "audio-chunk2",
                chunk: {
                  type: "buffer",
                  data: Buffer.from(message).toString("base64"),
                },
              });
              const listeners = Array.from(streams[roomId]?.listeners || []);
              listeners.forEach((listenerWs) => {
                if (
                  listenerWs.readyState === WebSocket.OPEN &&
                  listenerWs !== ws
                ) {
                  listenerWs.send(message_);
                }
              });
            }

            const timestamp = Date.now();
            const filePath = path.join(
              __dirname,
              "test",
              `audio_${timestamp}.mp3`
            );
            // fs.writeFile(filePath, Buffer.from(message), (err) => {
            //   if (err) {
            //     console.error("Error saving audio file:", err);
            //     ws.send(
            //       JSON.stringify({
            //         type: "error",
            //         message: "Failed to save audio",
            //       })
            //     );
            //   } else {
            //     console.log(`Audio saved as ${filePath}`);
            //   }
            // });
          } catch (error) {
            console.error("Error saving audio file:", error);
          }
          break;
        }

        case "delete-stream": {
          const { roomId } = data;
          delete streams[roomId];
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              client.send(
                JSON.stringify({
                  type: "remove-stream",
                  stream: [{ roomId }],
                })
              );
            }
          });
          break;
        }

        case "audio-chunk": {
          const { chunk } = data;

          const roomId = Object.keys(streams).find((roomId) =>
            streams[roomId].listeners.has(ws)
          );

          if (!roomId) {
            ws.send(
              JSON.stringify({ type: "error", message: "Not in a room" })
            );
            return;
          } else {
            const message = JSON.stringify({ type: "audio-chunk", chunk });
            const listeners = Array.from(streams[roomId]?.listeners || []);
            listeners.forEach((listenerWs) => {
              if (
                listenerWs.readyState === WebSocket.OPEN &&
                listenerWs !== ws
              ) {
                listenerWs.send(message);
              }
            });
          }

          break;
        }

        case "audio-chunk4": {
          const { chunk } = data;
          console.log("audio-chunk4", chunk);
          const message = JSON.stringify({ type: "audio-chunk3", chunk });
          ws.send(message);
          break;
        }

        default: {
          console.log("Unknown message type:", message);
        }
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
    }
  });

  ws.on("close", () => {
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
                  stream: [{ roomId: streamId }],
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
server.listen(PORT, () => {
  console.log(`HTTPS Server running on http://192.9.200.169:${PORT}`);
});
