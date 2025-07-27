const fs = require("fs");
const path = require("path");
const { v4: uuidV4 } = require("uuid");
const socketIOClient = require("socket.io-client");
const ffmpeg = require("fluent-ffmpeg");
const HttpsProxyAgent = require("https-proxy-agent");

// Proxy configuration
// const proxyUrl = "http://192.9.200.223:8080"; // Replace with your proxy URL
// const proxyAgent = new HttpsProxyAgent(proxyUrl);

// Socket configuration
const sockets = Array.from({ length: 16 }, () =>
  socketIOClient("http://192.9.200.216:3031/", {
    secure: true,
    //transports: ["websocket"], // Enforce WebSocket connection
    rejectUnauthorized: false, // Ignore self-signed certificate errors
    // agent: proxyAgent, // Use the proxy agent
  })
);

// Directory containing audio files
const audioDir = "./audios";

// Get audio files from the directory
const audioFiles = fs
  .readdirSync(audioDir)
  .filter(
    (file) =>
      path.extname(file).toLowerCase() === ".m4a" ||
      path.extname(file).toLowerCase() === ".mp3"
  ) // Filter .m4a files
  .map((file, index) => ({
    inputFile: path.join(audioDir, file),
    streamId: path.basename(file, path.extname(file)).trim().replace(/ /g, "_"), // Use file name without extension
    streamName: path.basename(file, path.extname(file)), // Use file name without extension
    socketIndex: index % sockets.length, // Distribute sockets
  }));

// Register streams
audioFiles.forEach(({ streamId, streamName, socketIndex }) => {
  const socket = sockets[socketIndex];
  socket.emit("register-stream", { roomId: streamId, name: streamName });
});

// Function to stream audio in 5-second packets with a 4.5-second gap and restart on error or end
const streamAudio = ({ inputFile, streamId, socket }) => {
  let currentTime = 0;

  const processAudio = () => {
    const ffmpegProcess = ffmpeg(inputFile)
      .setStartTime(currentTime)
      .setDuration(5) // Process 5-second segments
      .outputOptions("-f", "mp3") // Output in MP3 format
      .outputOptions("-c:a", "libmp3lame") // Use MP3 encoder
      .audioBitrate("128k") // Optimize bitrate for quality and size
      .on("end", () => {
        currentTime += 5;

        // Check if the current time exceeds file duration
        ffmpeg.ffprobe(inputFile, (err, metadata) => {
          if (err) {
            // console.error(`[${streamId}] Error probing file:`, err);
            return;
          }

          const duration = metadata.format.duration;
          if (currentTime >= duration) {
            // Restart song from beginning
            currentTime = 0;
          }

          // Set a 4.5-second gap before processing the next segment
          setTimeout(processAudio, 4800); // 4500ms gap after each 5-second segment
        });
      })
      .on("error", (err) => {
        // console.error(`[${streamId}] Error during streaming:`, err);
        // Retry after 1 second delay
        setTimeout(processAudio, 1000); // Retry after 1 second delay
      });

    // Pipe the audio data directly to the socket
    const ffmpegStream = ffmpegProcess.pipe();
    const chunks = [];

    ffmpegStream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    ffmpegStream.on("end", () => {
      const combinedChunk = Buffer.concat(chunks);
      socket.emit("audio-chunk", { roomId: streamId, chunk: combinedChunk });
    });

    ffmpegStream.on("error", (err) => {
      // console.error(`[${streamId}] Streaming error:`, err);
      // Restart the stream if there is an error while streaming
      setTimeout(processAudio, 1000); // Retry after 1 second delay
    });
  };

  processAudio();
};

// Start streaming for all audio files in parallel
audioFiles.forEach(({ inputFile, streamId, socketIndex }) => {
  const socket = sockets[socketIndex];
  socket.on("connect_timeout", () => {
    console.error("Connection timed out.");
  });
  streamAudio({ inputFile, streamId, socket });
});
