/**
 *
 * CODE BY AJAY OS [https://github.com/Ajayos]
 *
 * 🎧 Streaming Application
 * Handles UI interactions, audio streaming, WebSocket messaging, and file uploads 🚀
 */
class StreamingApp {
  constructor() {
    // 📊 Application state variables
    this.state = {
      messageCount: 0, // 📨 Total console messages
      audioPacketCount: 0, // 🎵 Audio packets received
      wsMessageCount: 0, // 📡 WebSocket messages
      fileUploadCount: 0, // 📂 File upload logs
      currentTab: "events", // 🖥️ Current log tab
      selectedFiles: [], // 📑 Selected files for upload
      currentStream: null, // 📺 Active stream ID
      rooms: [], // 🏠 Available rooms
      currentRoomRequest: null, // 🙋 Room request popup
      popupTimeout: null, // ⏱️ Timeout for popups
      chunkSize: 1.6 * 1000, // 📦 Default upload chunk size (1.6 KB)
    };

    // 🎵 Initialize audio context
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.playTime = this.audioCtx.currentTime;

    // 📒 Log storage
    this.logs = {
      events: [],
      websocket: [],
      audio: [],
      files: [],
    };

    // 🔌 Initialize WebSocket client
    this.wsClient = new WebSocketClient();

    // 📁 Cache DOM elements
    this.elements = {};

    // 🚀 Initialize app
    this.init();
  }

  /**
   * 🚀 Initialize app and setup listeners
   */
  init() {
    this.cacheElements(); // 📁 Cache DOM
    this.setupEventListeners(); // 🎛️ Attach UI listeners
    this.setupWebSocketHandlers(); // 📡 WS handlers
    this.updateUI(); // 🔄 Initial UI update

    // 🔌 Connect WebSocket
    this.wsClient.connect();

    this.logToConsole(
      "success",
      "✅ Application initialized successfully",
      null,
      "events"
    );
  }

  /**
   * 🗂️ Cache DOM elements for quick access (with line-by-line emojis and comments)
   */
  cacheElements() {
    this.elements = {
      // 🎛️ Stream controls
      streamSelect: document.getElementById("streamSelect"), // 🔽 Stream dropdown
      currentStreamName: document.getElementById("currentStreamName"), // 🏷️ Current stream name
      clearStreamBtn: document.getElementById("clearStreamBtn"), // ❌ Clear stream button
      markStreamBtn: document.getElementById("markStreamBtn"), // 🏷️ Mark stream button
      exitStreamBtn: document.getElementById("exitStreamBtn"), // 🚪 Exit stream button

      // 🟢 Status indicators
      connectionStatus: document.getElementById("connectionStatus"), // 🟢 Main status dot
      connectionStatus2: document.getElementById("connectionStatus2"), // 🟢 Secondary status dot
      statusText: document.getElementById("statusText"), // 📝 Status text
      audioStatus: document.getElementById("audioStatus"), // 🎵 Audio status text
      inDot: document.getElementById("inDot"), // ⬅️ Incoming dot
      outDot: document.getElementById("outDot"), // ➡️ Outgoing dot

      // 📊 Statistics
      streamCount: document.getElementById("streamCount"), // #️⃣ Stream count
      messageCount: document.getElementById("messageCount"), // #️⃣ Message count
      audioPackets: document.getElementById("audioPackets"), // #️⃣ Audio packets
      wsMessages: document.getElementById("wsMessages"), // #️⃣ WebSocket messages
      fileUploadCount: document.getElementById("fileUploadCount"), // #️⃣ File upload count

      // 📂 File handling
      fileInput: document.getElementById("fileInput"), // 📁 File input
      fileInputDisplay: document.getElementById("fileInputDisplay"), // 🖼️ File input display
      fileName: document.getElementById("fileName"), // 🏷️ File name display
      clearBtn: document.getElementById("clearBtn"), // ❌ Clear files button
      doneBtn: document.getElementById("doneBtn"), // ✅ Done/upload button
      uploadProgress: document.getElementById("uploadProgress"), // 📊 Upload progress bar container
      uploadProgressBar: document.getElementById("uploadProgressBar"), // 📈 Upload progress bar

      // 🔊 Audio elements
      player: document.getElementById("player"), // ▶️ Audio player
      callTone: document.getElementById("callTone"), // 📞 Call tone audio

      // 🖥️ Console
      consoleContent: document.getElementById("consoleContent"), // 📝 Console log area
      clearConsoleBtn: document.getElementById("clearConsoleBtn"), // 🧹 Clear console button
      exportLogsBtn: document.getElementById("exportLogsBtn"), // 📤 Export logs button

      // 🪟 Popups
      roomPopupOverlay: document.getElementById("roomPopupOverlay"), // 🪟 Room popup overlay
      roomPopup: document.getElementById("roomPopup"), // 🪟 Room popup
      roomPopupName: document.getElementById("roomPopupName"), // 🏷️ Room popup name
      roomPopupDetails: document.getElementById("roomPopupDetails"), // 📝 Room popup details
      acceptRoomBtn: document.getElementById("acceptRoomBtn"), // ✅ Accept room button
      declineRoomBtn: document.getElementById("declineRoomBtn"), // ❌ Decline room button

      // ⚙️ Upload settings popup
      uploadSettingsOverlay: document.getElementById("uploadSettingsOverlay"), // 🪟 Upload settings overlay
      uploadSettingsPopup: document.getElementById("uploadSettingsPopup"), // 🪟 Upload settings popup
      uploadSettingsBtn: document.getElementById("uploadSettingsBtn"), // ⚙️ Open upload settings button
      packetSize: document.getElementById("packetSize"), // 📦 Packet size input
      submitUploadSettingsBtn: document.getElementById(
        "submitUploadSettingsBtn"
      ), // ✅ Submit upload settings
      cancelUploadSettingsBtn: document.getElementById(
        "cancelUploadSettingsBtn"
      ), // ❌ Cancel upload settings
    };
  }

  /**
   * 🖱️ Setup UI event listeners
   */
  setupEventListeners() {
    // 🎛️ Stream controls
    this.elements.streamSelect.addEventListener("change", (e) =>
      this.handleStreamSelection(e.target.value)
    );
    this.elements.clearStreamBtn.addEventListener("click", () =>
      this.clearStream()
    );
    this.elements.markStreamBtn.addEventListener("click", () =>
      this.markStream()
    );
    this.elements.exitStreamBtn.addEventListener("click", () =>
      this.exitStream()
    );

    // 📂 File handling
    this.elements.fileInput.addEventListener("change", (e) =>
      this.handleFileSelection(e.target.files)
    );
    this.elements.clearBtn.addEventListener("click", () =>
      this.clearFileSelection()
    );
    this.elements.doneBtn.addEventListener("click", () => this.uploadFiles());

    // 🎵 Audio status
    this.elements.player.addEventListener("play", () =>
      this.updateAudioStatus("▶️ Playing Audio")
    );
    this.elements.player.addEventListener("pause", () =>
      this.updateAudioStatus("⏸️ Paused")
    );
    this.elements.player.addEventListener("ended", () =>
      this.updateAudioStatus("⏹️ Ended")
    );

    // 🖥️ Console actions
    this.elements.clearConsoleBtn.addEventListener("click", () =>
      this.clearConsole()
    );
    this.elements.exportLogsBtn.addEventListener("click", () =>
      this.exportLogs()
    );

    // 📑 Console tabs
    document.querySelectorAll(".console-tab").forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    // 🔔 Popup buttons
    this.elements.acceptRoomBtn.addEventListener("click", () =>
      this.acceptRoomRequest()
    );
    this.elements.declineRoomBtn.addEventListener("click", () =>
      this.dismissRoomPopup()
    );
    this.elements.uploadSettingsBtn.addEventListener("click", () =>
     // this.openUploadSettings()
    );
    this.elements.submitUploadSettingsBtn.addEventListener("click", () =>
      this.submitUploadSettings()
    );
    this.elements.cancelUploadSettingsBtn.addEventListener("click", () =>
      this.dismissUploadSettings()
    );

    // 🖱️ Overlay close
    this.elements.roomPopupOverlay.addEventListener("click", (e) => {
      if (e.target === this.elements.roomPopupOverlay) this.dismissRoomPopup();
    });
    this.elements.uploadSettingsOverlay.addEventListener("click", (e) => {
      if (e.target === this.elements.uploadSettingsOverlay)
        this.dismissUploadSettings();
    });

    // ⌨️ Keyboard escape
    document.addEventListener("keydown", (e) => this.handleKeydown(e));

    // 🚪 Cleanup before exit
    window.addEventListener("beforeunload", () => this.cleanup());
  }

  /**
   * 📡 Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    this.wsClient.on("connected", (data) => {
      this.updateConnectionStatus(true);
      this.logToConsole(
        "success",
        "✅ WebSocket connection established",
        data,
        "events"
      );
      this.logToConsole("websocket", "📡 Connection opened", data, "websocket");
      this.blinkIODot("out");
    });

    this.wsClient.on("disconnected", (data) => {
      this.updateConnectionStatus(false);
      this.logToConsole("warning", "⚠️ WebSocket disconnected", data, "events");
      this.logToConsole("websocket", "📡 Connection closed", data, "websocket");
    });

    this.wsClient.on("error", (data) => {
      this.logToConsole("error", "❌ WebSocket error", data, "events");
      this.logToConsole("websocket", "🔴 WebSocket error", data, "websocket");
      this.updateConnectionStatus(false);
    });

    this.wsClient.on("messageIn", (data) => {
      this.blinkIODot("in");
      this.logToConsole(
        "websocket",
        `⬅️ Received: ${data.type}`,
        data.payload,
        "websocket"
      );
    });

    this.wsClient.on("messageOut", (data) => {
      this.blinkIODot("out");
      this.logToConsole(
        "websocket",
        `➡️ Sent: ${data.type}`,
        data.payload,
        "websocket"
      );
    });

    this.wsClient.on("streamsAdded", (data) => {
      this.handleStreamsAdded(data);
    });

    this.wsClient.on("streamRemoved", (data) => {
      this.handleStreamRemoved(data);
    });

    this.wsClient.on("dtmf", (data) => {
      this.handleDtmf(data);
    });

    this.wsClient.on("mark", (data) => {
      this.handleMark(data);
    });

    this.wsClient.on("audioData", (data) => {
      this.handleAudioData(data);
    });

    this.wsClient.on("fileUploadResponse", (data) => {
      this.handleFileUploadResponse(data);
    });

    this.wsClient.on("serverError", (data) => {
      this.logToConsole(
        "error",
        `❌ Server error: ${data.error}`,
        data,
        "events"
      );
      this.showToast(`❌ Server error: ${data.error}`, "error");
    });
  }

  /**
   * 🎥 Handle streams added
   */
  handleStreamsAdded(data) {
    // 🏠 Add new streams to state.rooms array
    this.state.rooms = [...this.state.rooms, ...data.stream];

    // 🔁 Loop through each new stream
    data.stream.forEach((room) => {
      // 🆔 If room.id is undefined, set it from room.room_id
      if (room.id === undefined) {
        room.id = room.room_id;
        // 🪟 Show room request popup for new room
        this.showRoomRequestPopup({
          ...room,
          requester: room.requester || "Anonymous User", // 👤 Default requester
          timestamp: new Date().toISOString(), // 🕒 Current time
        });
      }
    });

    // 🔄 Update stream dropdown UI
    this.updateStreamList();

    // 📝 Log added streams to console
    this.logToConsole(
      "success", // ✅ Log type
      ` Added ${data.stream.length} stream(s)`, // 📝 Message
      data.stream, // 📦 Data
      "events" // 🖥️ Log tab
    );
  }

  handleDtmf(data) {
    // log the data.dtmf.digit
    console.log("DTMF digit received:", data.dtmf.digit);
    this.showToast(`DTMF digit received: ${data.dtmf.digit} `, "info");
    this.logToConsole(
      "success", // ✅ Log type
      `DTMF digit received: ${data.dtmf.digit} `, // 📝 Message
      data, // 📦 Data
      "events" // 🖥️ Log tab
    );
  }

  handleMark(data) {
    // log the data.mark
    console.log("Mark received:");
    this.showToast(`Mark received  `, "info");
    this.logToConsole(
      "success", // ✅ Log type
      `Mark received`, // 📝 Message
      data, // 📦 Data
      "events" // 🖥️ Log tab
    );
  }

  /**
   * 🎥 Handle stream removed (with line-by-line emojis and comments)
   */
  handleStreamRemoved(data) {
    // 🆔 Extract room ID from data
    const roomId = data?.room_id;
    if (!roomId) {
      // ❌ Log error if room ID is missing
      this.logToConsole(
        "error",
        "❌ Invalid room ID in remove-stream message",
        data,
        "events"
      );
      return; // ⏹️ Stop further processing
    }

    // 🔔 Show toast notification with reason
    this.showToast(`${data.reason}`, "error");

    // 🗑️ Remove the room from state.rooms array
    this.state.rooms = this.state.rooms.filter((room) => room.id !== roomId);

    // ⏹️ If the removed room is the current stream, stop streaming
    if (this.state.currentStream === roomId) {
      this.stopStreaming();
    }

    // 🔄 Update the stream dropdown UI
    this.updateStreamList();

    // 📝 Log the removed stream to console
    this.logToConsole(
      "warning", // ⚠️ Log type
      `🗑️ Removed stream: ${roomId}`, // 📝 Message
      null, // 📦 No extra data
      "events" // 🖥️ Log tab
    );
  }

  /**
   * 🎥 Handle audio data
   */
  handleAudioData(data) {
    // 📝 Log audio chunk received to console
    this.logToConsole(
      "audio", // 🎵 Log type
      "PCM audio chunk received", // 📝 Message
      {
        chunk: data.media?.chunk || "", // 🧩 Chunk identifier
        size: data.media?.payload ? data.media.payload.length : "unknown", // 📏 Payload size
      },
      "audio" // 🎵 Log tab
    );

    // ⏱️ If testtime is present, log delay info
    if (data.media?.testtime) {
      this.logDelayInfo(data.media.testtime);
    }

    // 🔊 Decode and play PCM audio chunk
    this.handlePCMAudioChunk(data.media);
  }

  /**
   * 📝 Log delay information
   */
  logDelayInfo(testtimeStr) {
    // 🧮 Compute delay using testtime string
    const { streamerTs, now, delayMs } = this.computeDelayIST(testtimeStr);

    if (streamerTs) {
      // 📝 Log delay info to console
      this.logToConsole(
        "audio", // 🎵 Log type
        `Stream delay: ${delayMs} ms\n` + // ⏱️ Delay in ms
          `[Client received: ${now.toISOString()}]\n` + // 🕒 Client receive time
          `[Streamer sent (IST raw): ${testtimeStr}]\n` + // 🕒 Raw IST string
          `[Parsed IST: ${streamerTs.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}]`, // 🗓️ Parsed IST time
        {
          delayMs, // ⏱️ Delay in ms
          clientReceiveTs: now.getTime(), // 🕒 Client receive timestamp
          streamerTs: streamerTs.getTime(), // 🕒 Streamer send timestamp
        },
        "audio" // 🎵 Log tab
      );
    } else {
      // ⚠️ Warn if testtime could not be parsed
      console.warn("Could not parse testtime:", testtimeStr);
    }
  }

  /**
   * 🧮 Compute delay from IST testtime (with line-by-line emojis and comments)
   */
  computeDelayIST(testtimeStr) {
    // 🕒 Parse the IST testtime string to a Date object
    const streamerTs = this.parseISTTestTime(testtimeStr);
    if (!streamerTs) {
      // ❌ Return nulls if parsing failed
      return { streamerTs: null, now: new Date(), delayMs: null };
    }

    // 🕰️ Get current client time
    const now = new Date();
    // ⏱️ Calculate delay in milliseconds
    const delayMs = now.getTime() - streamerTs.getTime();

    // 📦 Return computed values
    return { streamerTs, now, delayMs };
  }

  /**
   * 🕰️ Parse IST testtime string (with line-by-line emojis and comments)
   */
  parseISTTestTime(str) {
    // 🔎 Check if input string is valid and long enough
    if (!str || str.length < 17) return null;

    // 📅 Parse year, month, day
    const year = parseInt(str.slice(0, 4), 10); // 🗓️ Year
    const month = parseInt(str.slice(4, 6), 10) - 1; // 🗓️ Month (0-based)
    const day = parseInt(str.slice(6, 8), 10); // 🗓️ Day

    // 🕒 Parse hour, minute, second
    const hour = parseInt(str.slice(8, 10), 10); // 🕗 Hour
    const minute = parseInt(str.slice(10, 12), 10); // 🕧 Minute
    const second = parseInt(str.slice(12, 14), 10); // ⏱️ Second

    // 🕰️ Parse milliseconds
    const millis = parseInt(str.slice(14, 17), 10); // 🪙 Milliseconds

    // ❌ Return null if any date part is invalid
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    // 📆 Construct and return JS Date object
    return new Date(year, month, day, hour, minute, second, millis);
  }

  /**
   * 🎛️ Handle stream selection (with line-by-line emojis and comments)
   */
  handleStreamSelection(selectedStream) {
    // 🔄 If the selected stream is different from the current one
    if (this.state.currentStream !== selectedStream) {
      // ⏹️ If already in a stream, stop it first
      if (this.state.currentStream) {
        this.stopStreaming();
      }

      // 🆕 Set the new current stream
      this.state.currentStream = selectedStream;

      // ✅ If a stream is selected
      if (this.state.currentStream) {
        // 🔍 Find the selected room object by ID
        const selectedRoom = this.state.rooms.find(
          (room) => room.id === this.state.currentStream
        );
        // 🏷️ Update UI with stream name or fallback
        this.elements.currentStreamName.textContent = selectedRoom
          ? selectedRoom.name
          : "Unknown Stream";
        // 🔓 Enable clear and mark buttons
        this.elements.clearStreamBtn.disabled = false;
        this.elements.markStreamBtn.disabled = false;
        this.elements.exitStreamBtn.disabled = false;

        // ▶️ Start streaming the selected room
        this.startStreaming();
        // 📝 Log stream selection to console
        this.logToConsole(
          "info",
          `Selected stream: ${selectedRoom?.name || "Unknown"}`,
          selectedRoom,
          "events"
        );
      } else {
        // 🚫 No stream selected, disable buttons and update UI
        this.elements.clearStreamBtn.disabled = true;
        this.elements.markStreamBtn.disabled = true;
        this.elements.exitStreamBtn.disabled = true;
        this.elements.currentStreamName.textContent = "No stream selected";
      }
    }
  }

  /**
   * Start streaming
   */
  startStreaming() {
    if (!this.state.currentStream || !this.wsClient.isConnected) return;

    this.logToConsole(
      "info",
      `Starting stream: ${this.state.currentStream}`,
      null,
      "events"
    );
    this.wsClient.joinRoom(this.state.currentStream);
    this.logToConsole(
      "success",
      `Joined room: ${this.state.currentStream}`,
      null,
      "events"
    );
  }

  /**
   * Stop streaming
   */
  stopStreaming() {
    if (this.state.currentStream) {
      this.wsClient.leaveRoom(this.state.currentStream);
      this.logToConsole(
        "info",
        `Left room: ${this.state.currentStream}`,
        null,
        "events"
      );

      this.state.currentStream = null;
      this.elements.clearStreamBtn.disabled = true;
      this.elements.markStreamBtn.disabled = true;
      this.elements.exitStreamBtn.disabled = true;
      this.elements.currentStreamName.textContent = "No stream selected";
    }
  }

  /**
   * Clear stream
   */
  clearStream() {
    if (this.wsClient.clearStream(this.state.currentStream)) {
      this.logToConsole(
        "info",
        `Sent clear audio to ${this.state.currentStream}`,
        null,
        "events"
      );
      this.showToast("Cleared audio stream", "info");
    }
  }

  /**
   * Mark stream
   */
  markStream() {
    if (this.wsClient.markStream(this.state.currentStream)) {
      this.logToConsole(
        "info",
        `Marked audio to ${this.state.currentStream}`,
        null,
        "events"
      );
      this.showToast("Marked audio stream", "info");
    }
  }

  /**
   * exit stream
   */
  exitStream() {
    if (this.wsClient.exitStream(this.state.currentStream)) {
      this.logToConsole(
        "info",
        `Exited stream: ${this.state.currentStream}`,
        null,
        "events"
      );
      this.showToast("Exited audio stream", "info");
    }
  }

  // 🎵 Decode + play PCM audio
  handlePCMAudioChunk(chunk, options = {}) {
    try {
      const {
        sampleRate = 8000,
        numChannels = 1,
        bitsPerSample = 16,
      } = options;

      if (!chunk.payload) throw new Error("Missing PCM payload");

      // 🔑 Decode base64 PCM → Uint8Array
      const binary = atob(chunk.payload);
      const rawPCM = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        rawPCM[i] = binary.charCodeAt(i);
      }

      const bytesPerSample = bitsPerSample / 8;
      const sampleCount = rawPCM.length / bytesPerSample;
      const audioBuffer = this.audioCtx.createBuffer(
        numChannels,
        sampleCount,
        sampleRate
      );

      // 📝 Fill buffer (16-bit signed PCM → float [-1,1])
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        const sample = rawPCM[i * 2] | (rawPCM[i * 2 + 1] << 8);
        channelData[i] =
          sample < 0x8000 ? sample / 32768 : (sample - 65536) / 32768;
      }

      // 🔊 Create playback source
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);

      // 🕒 Status: Playing
      this.updateAudioStatus("▶️ Playing Audio");

      // ⏱️ Scheduling logic
      const now = this.audioCtx.currentTime;
      let gap = this.playTime - now;

      // 🛠️ Log scheduling gap
      this.logToConsole(
        "audio",
        `⏱️ Audio scheduling: Current=${now.toFixed(
          3
        )} Playhead=${this.playTime.toFixed(3)} Gap=${gap.toFixed(3)} sec`,
        null,
        "audio"
      );

      // 🎯 Target small buffer ahead (e.g. 0.1s)
      const targetLead = 0.1;

      // If too far ahead → slowly pull back
      if (gap > targetLead + 0.3) {
        this.logToConsole(
          "warn",
          "⚠️ Too much buffered ahead, adjusting back smoothly.",
          null,
          "audio"
        );
        console.warn("⚠️ Too much buffered ahead, adjusting back smoothly.");
        this.playTime -= 0.2; // shift back slightly
      }

      // If underrun → push forward closer to now
      if (gap < targetLead - 0.2) {
        this.logToConsole(
          "warn",
          "⚠️ Underrun detected, adjusting forward.",
          null,
          "audio"
        );
        console.warn("⚠️ Underrun detected, adjusting forward.");
        this.playTime = now + targetLead;
      }

      // ▶️ Schedule playback
      source.start(this.playTime);

      // ⏹️ Status: Ended when playback finishes
      source.onended = () => {
        this.updateAudioStatus("⏹️ Ended");
      };

      this.playTime += audioBuffer.duration;
    } catch (err) {
      this.logToConsole("error", "❌ PCM chunk playback failed:", err);
      console.error("❌ PCM chunk playback failed:", err);
    }
  }

  /**
   * 📂 Handle file selection from input
   */
  handleFileSelection(files) {
    // 🗂️ Convert FileList to array and store in state
    this.state.selectedFiles = Array.from(files);

    // 📝 Update file display UI
    this.updateFileDisplay();

    // 🎛️ Update action buttons (clear/done)
    this.updateActionButtons();

    // 📝 Log file selection to console
    this.logToConsole(
      "files", // 📁 Log type
      `📂 Selected ${this.state.selectedFiles.length} file(s)`, // 📝 Message
      this.state.selectedFiles.map((f) => ({
        name: f.name, // 📄 File name
        size: f.size, // 📏 File size
        type: f.type, // 🏷️ File type
      })),
      "files" // 📁 Log tab
    );
  }

  /**
   * 📑 Update file display UI
   */
  updateFileDisplay() {
    // 📦 Get display and file name elements
    const display = this.elements.fileInputDisplay;
    const fileName = this.elements.fileName;

    // 📂 If files are selected
    if (this.state.selectedFiles.length > 0) {
      display.classList.add("has-file"); // ✅ Highlight display
      if (this.state.selectedFiles.length === 1) {
        // 📝 Show single file name
        fileName.textContent = this.state.selectedFiles[0].name;
      } else {
        // 🗃️ Show count for multiple files
        fileName.textContent = `${this.state.selectedFiles.length} files selected`;
      }
    } else {
      // ❌ No files selected, reset UI
      display.classList.remove("has-file");
      fileName.textContent = "";
    }
  }

  /**
   * 🎛️ Update action buttons (clear/done)
   */
  updateActionButtons() {
    // 📂 Check if any files are selected
    const hasFiles = this.state.selectedFiles.length > 0;

    // ❌ Enable/disable clear button
    this.elements.clearBtn.disabled = !hasFiles;

    // ✅ Enable/disable done (upload) button
    this.elements.doneBtn.disabled = !hasFiles;
  }

  /**
   * ❌🗂️ Clear file selection
   */
  clearFileSelection() {
    // 🗑️ Clear selected files array in state
    this.state.selectedFiles = [];
    // 🧹 Reset file input element value
    this.elements.fileInput.value = "";
    // 🔄 Update file display UI
    this.updateFileDisplay();
    // 🎛️ Update action buttons (clear/done)
    this.updateActionButtons();
    // 🚫 Hide upload progress bar
    this.hideUploadProgress();
    // 📝 Log file selection cleared to console
    this.logToConsole("files", "🗑️ File selection cleared", null, "files");
    // 🔔 Show toast notification
    this.showToast("🗑️ File selection cleared", "info");
  }

  /**
   * 📤 Upload files (with line-by-line emojis and comments)
   */
  async uploadFiles() {
    // 🛑 Check if files are selected, WebSocket is connected, and a stream is selected
    if (this.state.selectedFiles.length === 0) {
      this.logToConsole(
        "warning",
        "❌ No files selected for upload",
        null,
        "files"
      );
      this.showToast("No files selected", "warning");
      return;
    }
    if (!this.wsClient.isConnected) {
      this.logToConsole("warning", "❌ WebSocket not connected", null, "files");
      this.showToast("WebSocket not connected", "warning");
      return;
    }
    if (!this.state.currentStream) {
      this.logToConsole(
        "warning",
        "❌ No stream selected for upload",
        null,
        "files"
      );
      this.showToast("No stream selected", "warning");
      return;
    }

    // 📊 Show upload progress bar
    this.showUploadProgress();

    // 🔁 Loop through each selected file
    for (let i = 0; i < this.state.selectedFiles.length; i++) {
      const file = this.state.selectedFiles[i]; // 📄 Get file
      // ⏫ Upload single file (await for sequential upload)
      await this.uploadSingleFile(file, i + 1, this.state.selectedFiles.length);
    }

    // ✅ Hide upload progress bar after all uploads
    this.hideUploadProgress();
    // 🎉 Show success toast
    this.showToast(
      `Successfully uploaded ${this.state.selectedFiles.length} file(s)`,
      "success"
    );
    // 🧹 Clear file selection after upload
    this.clearFileSelection();
  }

  /**
   * 📤 Upload a single WAV file in 1600 KB chunks
   * ⚠️ Skips the first 44 bytes (WAV header) only in the first chunk
   */
  async uploadSingleFile(file, index, total) {
    const HARD_CHUNK_SIZE = this.state.chunkSize;
    const totalChunks = Math.ceil(file.size / HARD_CHUNK_SIZE);

    // Validate WAV file
    if (!file.name.toLowerCase().endsWith(".wav")) {
      this.logToConsole(
        "error",
        `Invalid file format: ${file.name}. Only WAV files are supported.`,
        {},
        "files"
      );
      return;
    }

    this.logToConsole(
      "files",
      `📤 Uploading file: ${file.name} (${totalChunks} chunks, ${HARD_CHUNK_SIZE} bytes each)`,
      { name: file.name, size: file.size, type: file.type },
      "files"
    );

    let sequenceNumber = 0; // 🔢 keep track of sequence

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * HARD_CHUNK_SIZE;
      const end = Math.min(start + HARD_CHUNK_SIZE, file.size);
      let chunk = file.slice(start, end);

      // Skip WAV header (44 bytes) for first chunk only
      if (chunkIndex === 0) {
        chunk = chunk.slice(44);
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;

        const pcm = new Int16Array(arrayBuffer);

        // 🚫 Skip if silent (threshold: < 1% of full scale to allow tiny noise)
        let maxAmp = 0;
        for (let i = 0; i < pcm.length; i++) {
          maxAmp = Math.max(maxAmp, Math.abs(pcm[i]));
        }
        if (maxAmp < 327.67) {
          // ~1% threshold; adjust as needed
          this.logToConsole(
            "info",
            `⏭️ Skipping silent chunk ${chunkIndex}`,
            { chunkIndex, maxAmp },
            "files"
          );
          sequenceNumber++; // Increment to maintain sequence
          // Update progress
          const progress =
            (((index - 1) * totalChunks + chunkIndex + 1) /
              (total * totalChunks)) *
            100;
          this.updateUploadProgress(progress);
          await new Promise((resolve) => setTimeout(resolve, 10));
          return;
        }

        // Encode to base64 (raw PCM, no normalization)
        const uint8 = new Uint8Array(pcm.buffer);
        const base64Data = btoa(String.fromCharCode(...uint8));

        // 🕒 Timestamp (ms)
        const timestamp = Date.now();

        // 📦 Wrap packet
        const uploadData = {
          event: "audio",
          sequence_number: sequenceNumber++, // auto-increment
          room_id: this.state.currentStream,
          media: {
            chunk: chunkIndex,
            timestamp,
            payload: base64Data,
          },
        };

        // 🚀 Send via WebSocket
        const packet = JSON.stringify(uploadData);
        this.wsClient.send(packet);

        // 📏 Log *base64 payload* size only
        const base64SizeBytes = base64Data.length * (3 / 4); // convert base64 length → approx bytes
        const base64SizeKB = (base64SizeBytes / 1024).toFixed(2);

        this.logToConsole(
          "warning",
          `📦 Sent packet #${sequenceNumber - 1} | Size: ${base64SizeKB} KB`,
          { chunkIndex, base64SizeBytes, base64SizeKB },
          "files"
        );
        // wait for 100 milliseconds
        //await new Promise((resolve) => setTimeout(resolve, 100));
      };

      reader.readAsArrayBuffer(chunk);

      // 📊 Progress update
      const progress =
        (((index - 1) * totalChunks + chunkIndex + 1) / (total * totalChunks)) *
        100;
      this.updateUploadProgress(progress);

      // ⏳ Small pause
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Handle file upload response
   */
  handleFileUploadResponse(response) {
    if (response.success) {
      this.logToConsole(
        "files",
        `File upload successful: ${response.fileName}`,
        response,
        "files"
      );
    } else {
      this.logToConsole(
        "files",
        `File upload failed: ${response.fileName} - ${response.error}`,
        response,
        "files"
      );
      this.showToast(`Upload failed: ${response.error}`, "error");
    }
  }

  /**
   * Show upload progress
   */
  showUploadProgress() {
    this.elements.uploadProgress.classList.add("show");
  }

  /**
   * Hide upload progress
   */
  hideUploadProgress() {
    this.elements.uploadProgress.classList.remove("show");
    this.updateUploadProgress(0);
  }

  /**
   * Update upload progress
   */
  updateUploadProgress(percentage) {
    this.elements.uploadProgressBar.style.width = `${percentage}%`;
  }

  /**
   * Update stream list
   */
  updateStreamList() {
    this.elements.streamSelect.innerHTML =
      '<option value="">Select a stream</option>';

    this.state.rooms.forEach((room) => {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = room.name;
      if (this.state.currentStream === room.id) {
        option.selected = true;
      }
      this.elements.streamSelect.appendChild(option);
    });

    if (this.state.currentStream) {
      this.elements.streamSelect.value = this.state.currentStream;
    }

    this.elements.streamCount.textContent = this.state.rooms.length;
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(connected) {
    if (connected) {
      this.elements.connectionStatus.classList.add("connected");
      this.elements.connectionStatus2.classList.add("connected");
      this.elements.statusText.textContent = "Connected";
    } else {
      this.elements.connectionStatus.classList.remove("connected");
      this.elements.connectionStatus2.classList.add("disconnected");
      this.elements.statusText.textContent = "Disconnected";
    }
  }

  /**
   * Update audio status
   */
  updateAudioStatus(status) {
    this.elements.audioStatus.textContent = status;
    if (status === "Playing Audio") {
      this.blinkDot2("audio");
    }
  }

  /**
   * Blink I/O dots
   */
  blinkIODot(direction) {
    const dot = this.elements[direction === "in" ? "inDot" : "outDot"];
    dot.classList.add("active");
    this.blinkDot2(direction === "in" ? "inDot" : "outDot");
    setTimeout(() => dot.classList.remove("active"), 300);
  }

  /**
   * Blink status dot 2
   */
  blinkDot2(dotId) {
    this.elements.connectionStatus2.classList.forEach((cls) => {
      if (cls !== "status-dot2") {
        this.elements.connectionStatus2.classList.remove(cls);
      }
    });
    this.elements.connectionStatus2.classList.add(dotId);
    setTimeout(
      () => this.elements.connectionStatus2.classList.remove(dotId),
      300
    );
  }

  /**
   * Show room request popup
   */
  showRoomRequestPopup(roomData) {
    if (this.state.currentStream) return; // Skip if already in a room

    this.state.currentRoomRequest = roomData;
    this.playCallTone();

    this.elements.roomPopupName.textContent = roomData.name || "Unknown Room";
    this.elements.roomPopupDetails.textContent = `Room ID: ${
      roomData.id || "N/A"
    }\nTime: ${new Date(roomData.timestamp).toLocaleString()}`;

    this.elements.roomPopupOverlay.classList.add("show");
    this.elements.roomPopup.classList.add("show");

    this.state.popupTimeout = setTimeout(() => this.dismissRoomPopup(), 15000);

    this.logToConsole(
      "events",
      `Room request popup shown: ${roomData.name}`,
      roomData,
      "events"
    );
  }

  /**
   * Accept room request
   */
  acceptRoomRequest() {
    if (this.state.currentRoomRequest) {
      this.elements.streamSelect.value = this.state.currentRoomRequest.id;
      this.handleStreamSelection(this.state.currentRoomRequest.id);

      this.logToConsole(
        "success",
        `Accepted room request: ${this.state.currentRoomRequest.name}`,
        this.state.currentRoomRequest,
        "events"
      );
      this.showToast(
        `Room "${this.state.currentRoomRequest.name}" accepted!`,
        "success"
      );
    }
    this.dismissRoomPopup();
  }

  /**
   * Dismiss room popup
   */
  dismissRoomPopup() {
    this.stopCallTone();
    this.elements.roomPopupOverlay.classList.remove("show");
    this.elements.roomPopup.classList.remove("show");

    if (this.state.popupTimeout) {
      clearTimeout(this.state.popupTimeout);
      this.state.popupTimeout = null;
    }

    setTimeout(() => {
      this.state.currentRoomRequest = null;
    }, 400);
  }

  /**
   * Play call tone
   */
  playCallTone() {
    this.elements.callTone.muted = false;
  }

  /**
   * Stop call tone
   */
  stopCallTone() {
    this.elements.callTone.muted = true;
    this.elements.callTone.currentTime = 0;
  }

  /**
   * Open upload settings
   */
  openUploadSettings() {
    this.elements.packetSize.value = this.state.chunkSize / 1000;
    this.elements.uploadSettingsOverlay.classList.add("show");
    this.elements.uploadSettingsPopup.classList.add("show");
  }

  /**
   * Submit upload settings
   */
  submitUploadSettings() {
    const newSize = parseInt(this.elements.packetSize.value);
    if (newSize > 0) {
       this.state.chunkSize = parseInt(newSize * 1000); // 1.6
      this.showToast(`Packet size set to ${newSize} KB`, "success");
      this.logToConsole(
        "info",
        `Updated packet size to ${newSize} KB`,
        null,
        "files"
      );
    } else {
      this.showToast("Invalid packet size", "warning");
    }
    this.dismissUploadSettings();
  }

  /**
   * Dismiss upload settings
   */
  dismissUploadSettings() {
    this.elements.uploadSettingsOverlay.classList.remove("show");
    this.elements.uploadSettingsPopup.classList.remove("show");
  }

  /**
   * 📝 Log messages with emoji + timestamp
   */
  logToConsole(type, message, data = null, tab = "events") {
    this.state.messageCount++;
    this.elements.messageCount.textContent = this.state.messageCount;

    if (tab === "audio") {
      this.state.audioPacketCount++;
      this.elements.audioPackets.textContent = this.state.audioPacketCount;
    } else if (tab === "websocket") {
      this.state.wsMessageCount++;
      this.elements.wsMessages.textContent = this.state.wsMessageCount;
    } else if (tab === "files") {
      this.state.fileUploadCount++;
      this.elements.fileUploadCount.textContent = this.state.fileUploadCount;
    }

    const now = new Date();
    const timestamp = `${now.toLocaleTimeString()}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, "0")}`;

    const logEntry = { timestamp, type, message, data };
    this.logs[tab].push(logEntry);

    if (this.state.currentTab === tab) {
      this.renderLogEntry(logEntry);
    }
  }

  /**
   * Render log entry
   */
  renderLogEntry(logEntry) {
    const logDiv = document.createElement("div");
    logDiv.className = `log-entry ${logEntry.type}`;

    let logData = "";
    if (logEntry.data) {
      logData = `<div class="log-data">${JSON.stringify(
        logEntry.data,
        null,
        2
      )}</div>`;
    }

    logDiv.innerHTML = `
            <span class="log-timestamp">${logEntry.timestamp}</span>
            <span class="log-type ${logEntry.type}">${logEntry.type}</span>
            <span class="log-message">${logEntry.message}</span>
            ${logData}
        `;

    this.elements.consoleContent.appendChild(logDiv);
    this.elements.consoleContent.scrollTop =
      this.elements.consoleContent.scrollHeight;
  }

  /**
   * Switch console tab
   */
  switchTab(tab) {
    this.state.currentTab = tab;
    document
      .querySelectorAll(".console-tab")
      .forEach((t) => t.classList.remove("active"));
    document.querySelector(`[data-tab="${tab}"]`).classList.add("active");

    this.elements.consoleContent.innerHTML = "";
    this.logs[tab].forEach((log) => this.renderLogEntry(log));
  }

  /**
   * Clear console
   */
  clearConsole() {
    this.logs[this.state.currentTab] = [];
    this.elements.consoleContent.innerHTML = "";

    if (this.state.currentTab === "events") {
      this.state.messageCount = 0;
      this.elements.messageCount.textContent = "0";
    } else if (this.state.currentTab === "audio") {
      this.state.audioPacketCount = 0;
      this.elements.audioPackets.textContent = "0";
    } else if (this.state.currentTab === "websocket") {
      this.state.wsMessageCount = 0;
      this.elements.wsMessages.textContent = "0";
    } else if (this.state.currentTab === "files") {
      this.state.fileUploadCount = 0;
      this.elements.fileUploadCount.textContent = "0";
    }

    this.logToConsole(
      "info",
      `${
        this.state.currentTab.charAt(0).toUpperCase() +
        this.state.currentTab.slice(1)
      } console cleared`,
      null,
      this.state.currentTab
    );
  }

  /**
   * Export logs
   */
  exportLogs() {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(this.logs, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `console-logs-${new Date().toISOString()}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    this.logToConsole("success", "Logs exported successfully", null, "events");
  }

  /**
   * 🔔 Show toast notification
   */
  showToast(message, type = "info") {
    const bgColors = {
      success: "linear-gradient(135deg, #00ff88, #00e676)",
      warning: "linear-gradient(135deg, #ffb800, #ffa726)",
      error: "linear-gradient(135deg, #ff4757, #ff3742)",
      info: "linear-gradient(135deg, #667eea, #764ba2)",
    };

    Toastify({
      text: message,
      duration: 3000,
      backgroundColor: bgColors[type] || bgColors.info,
    }).showToast();
  }

  /**
   * Handle keyboard events
   */
  handleKeydown(e) {
    if (e.key === "Escape") {
      if (this.elements.roomPopupOverlay.classList.contains("show")) {
        this.dismissRoomPopup();
      }
      if (this.elements.uploadSettingsOverlay.classList.contains("show")) {
        this.dismissUploadSettings();
      }
    }
  }

  /**
   * Update UI
   */
  updateUI() {
    this.updateActionButtons();
    this.updateStreamList();
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.wsClient.disconnect();
    if (this.state.popupTimeout) {
      clearTimeout(this.state.popupTimeout);
    }
  }
}

// 🚀 Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.streamingApp = new StreamingApp();
});
