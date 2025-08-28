/**
 * Main Application Module
 * Manages UI interactions, audio processing, and file handling
 */
class StreamingApp {
    constructor() {
        // Application state
        this.state = {
            messageCount: 0,
            audioPacketCount: 0,
            wsMessageCount: 0,
            fileUploadCount: 0,
            currentTab: 'events',
            selectedFiles: [],
            currentStream: null,
            rooms: [],
            currentRoomRequest: null,
            popupTimeout: null,
            chunkSize: 64 * 1024 // Default chunk size
        };

        // Audio context and processing
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.playTime = this.audioCtx.currentTime;

        // Console logs
        this.logs = {
            events: [],
            websocket: [],
            audio: [],
            files: []
        };

        // WebSocket client
        this.wsClient = new WebSocketClient();

        // DOM elements cache
        this.elements = {};

        // Initialize app
        this.init();
    }

    /**
     * Initialize application
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.setupWebSocketHandlers();
        this.updateUI();
        
        // Connect WebSocket
        this.wsClient.connect();
        
        this.logToConsole('success', 'Application initialized successfully', null, 'events');
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Stream controls
            streamSelect: document.getElementById('streamSelect'),
            currentStreamName: document.getElementById('currentStreamName'),
            clearStreamBtn: document.getElementById('clearStreamBtn'),
            stopStreamBtn: document.getElementById('stopStreamBtn'),
            
            // Status indicators
            connectionStatus: document.getElementById('connectionStatus'),
            connectionStatus2: document.getElementById('connectionStatus2'),
            statusText: document.getElementById('statusText'),
            audioStatus: document.getElementById('audioStatus'),
            inDot: document.getElementById('inDot'),
            outDot: document.getElementById('outDot'),
            
            // Statistics
            streamCount: document.getElementById('streamCount'),
            messageCount: document.getElementById('messageCount'),
            audioPackets: document.getElementById('audioPackets'),
            wsMessages: document.getElementById('wsMessages'),
            fileUploadCount: document.getElementById('fileUploadCount'),
            
            // File handling
            fileInput: document.getElementById('fileInput'),
            fileInputDisplay: document.getElementById('fileInputDisplay'),
            fileName: document.getElementById('fileName'),
            clearBtn: document.getElementById('clearBtn'),
            doneBtn: document.getElementById('doneBtn'),
            uploadProgress: document.getElementById('uploadProgress'),
            uploadProgressBar: document.getElementById('uploadProgressBar'),
            
            // Audio elements
            player: document.getElementById('player'),
            callTone: document.getElementById('callTone'),
            
            // Console
            consoleContent: document.getElementById('consoleContent'),
            clearConsoleBtn: document.getElementById('clearConsoleBtn'),
            exportLogsBtn: document.getElementById('exportLogsBtn'),
            
            // Popups
            roomPopupOverlay: document.getElementById('roomPopupOverlay'),
            roomPopup: document.getElementById('roomPopup'),
            roomPopupName: document.getElementById('roomPopupName'),
            roomPopupDetails: document.getElementById('roomPopupDetails'),
            acceptRoomBtn: document.getElementById('acceptRoomBtn'),
            declineRoomBtn: document.getElementById('declineRoomBtn'),
            
            uploadSettingsOverlay: document.getElementById('uploadSettingsOverlay'),
            uploadSettingsPopup: document.getElementById('uploadSettingsPopup'),
            uploadSettingsBtn: document.getElementById('uploadSettingsBtn'),
            packetSize: document.getElementById('packetSize'),
            submitUploadSettingsBtn: document.getElementById('submitUploadSettingsBtn'),
            cancelUploadSettingsBtn: document.getElementById('cancelUploadSettingsBtn')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Stream selection
        this.elements.streamSelect.addEventListener('change', (e) => this.handleStreamSelection(e.target.value));
        this.elements.clearStreamBtn.addEventListener('click', () => this.clearStream());
        this.elements.stopStreamBtn.addEventListener('click', () => this.markStream());

        // File handling
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files));
        this.elements.clearBtn.addEventListener('click', () => this.clearFileSelection());
        this.elements.doneBtn.addEventListener('click', () => this.uploadFiles());

        // Audio events
        this.elements.player.addEventListener('play', () => this.updateAudioStatus('Playing Audio'));
        this.elements.player.addEventListener('pause', () => this.updateAudioStatus('Paused'));
        this.elements.player.addEventListener('ended', () => this.updateAudioStatus('Ended'));

        // Console events
        this.elements.clearConsoleBtn.addEventListener('click', () => this.clearConsole());
        this.elements.exportLogsBtn.addEventListener('click', () => this.exportLogs());

        // Console tabs
        document.querySelectorAll('.console-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Popup events
        this.elements.acceptRoomBtn.addEventListener('click', () => this.acceptRoomRequest());
        this.elements.declineRoomBtn.addEventListener('click', () => this.dismissRoomPopup());
        this.elements.uploadSettingsBtn.addEventListener('click', () => this.openUploadSettings());
        this.elements.submitUploadSettingsBtn.addEventListener('click', () => this.submitUploadSettings());
        this.elements.cancelUploadSettingsBtn.addEventListener('click', () => this.dismissUploadSettings());

        // Popup overlay clicks
        this.elements.roomPopupOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.roomPopupOverlay) this.dismissRoomPopup();
        });
        this.elements.uploadSettingsOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.uploadSettingsOverlay) this.dismissUploadSettings();
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Window cleanup
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        this.wsClient.on('connected', (data) => {
            this.updateConnectionStatus(true);
            this.logToConsole('success', 'WebSocket connection established', data, 'events');
            this.logToConsole('websocket', 'Connection opened', data, 'websocket');
            this.blinkIODot('out');
        });

        this.wsClient.on('disconnected', (data) => {
            this.updateConnectionStatus(false);
            this.logToConsole('warning', 'WebSocket connection closed', data, 'events');
            this.logToConsole('websocket', 'Connection closed', data, 'websocket');
        });

        this.wsClient.on('error', (data) => {
            this.logToConsole('error', 'WebSocket connection error', data, 'events');
            this.logToConsole('websocket', 'WebSocket error', data, 'websocket');
            this.updateConnectionStatus(false);
        });

        this.wsClient.on('messageIn', (data) => {
            this.blinkIODot('in');
            this.logToConsole('websocket', `Received: ${data.type}`, data.payload, 'websocket');
        });

        this.wsClient.on('messageOut', (data) => {
            this.blinkIODot('out');
            this.logToConsole('websocket', `Sent: ${data.type}`, data.payload, 'websocket');
        });

        this.wsClient.on('streamsAdded', (data) => {
            this.handleStreamsAdded(data);
        });

        this.wsClient.on('streamRemoved', (data) => {
            this.handleStreamRemoved(data);
        });

        this.wsClient.on('audioData', (data) => {
            this.handleAudioData(data);
        });

        this.wsClient.on('fileUploadResponse', (data) => {
            this.handleFileUploadResponse(data);
        });

        this.wsClient.on('serverError', (data) => {
            this.logToConsole('error', `Server error: ${data.error}`, data, 'events');
            this.showToast(`Server error: ${data.error}`, 'error');
        });
    }

    /**
     * Handle streams added
     */
    handleStreamsAdded(data) {
        this.state.rooms = [...this.state.rooms, ...data.stream];
        
        data.stream.forEach(room => {
            if (room.id === undefined) {
                room.id = room.room_id;
                this.showRoomRequestPopup({
                    ...room,
                    requester: room.requester || 'Anonymous User',
                    timestamp: new Date().toISOString()
                });
            }
        });

        this.updateStreamList();
        this.logToConsole('success', `Added ${data.stream.length} stream(s)`, data.stream, 'events');
    }

    /**
     * Handle stream removed
     */
    handleStreamRemoved(data) {
        const roomId = data?.room_id;
        if (!roomId) {
            this.logToConsole('error', 'Invalid room ID in remove-stream message', data, 'events');
            return;
        }

        this.showToast(`${data.reason}`, 'error');
        this.state.rooms = this.state.rooms.filter(room => room.id !== roomId);
        
        if (this.state.currentStream === roomId) {
            this.stopStreaming();
        }
        
        this.updateStreamList();
        this.logToConsole('warning', `Removed stream: ${roomId}`, null, 'events');
    }

    /**
     * Handle audio data
     */
    handleAudioData(data) {
        this.logToConsole('audio', 'PCM audio chunk received', {
            chunk: data.media?.chunk || '',
            size: data.media?.payload ? data.media.payload.length : 'unknown'
        }, 'audio');

        if (data.media?.testtime) {
            this.logDelayInfo(data.media.testtime);
        }

        this.handlePCMAudioChunk(data.media);
    }

    /**
     * Log delay information
     */
    logDelayInfo(testtimeStr) {
        const { streamerTs, now, delayMs } = this.computeDelayIST(testtimeStr);

        if (streamerTs) {
            this.logToConsole('audio', 
                `Stream delay: ${delayMs} ms\n` +
                `[Client received: ${now.toISOString()}]\n` +
                `[Streamer sent (IST raw): ${testtimeStr}]\n` +
                `[Parsed IST: ${streamerTs.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}]`,
                { delayMs, clientReceiveTs: now.getTime(), streamerTs: streamerTs.getTime() },
                'audio'
            );
        } else {
            console.warn('Could not parse testtime:', testtimeStr);
        }
    }

    /**
     * Compute delay from IST testtime
     */
    computeDelayIST(testtimeStr) {
        const streamerTs = this.parseISTTestTime(testtimeStr);
        if (!streamerTs) {
            return { streamerTs: null, now: new Date(), delayMs: null };
        }

        const now = new Date();
        const delayMs = now.getTime() - streamerTs.getTime();

        return { streamerTs, now, delayMs };
    }

    /**
     * Parse IST testtime string
     */
    parseISTTestTime(str) {
        if (!str || str.length < 17) return null;

        const year = parseInt(str.slice(0, 4), 10);
        const month = parseInt(str.slice(4, 6), 10) - 1; // JS months 0-11
        const day = parseInt(str.slice(6, 8), 10);
        const hour = parseInt(str.slice(8, 10), 10);
        const minute = parseInt(str.slice(10, 12), 10);
        const second = parseInt(str.slice(12, 14), 10);
        const millis = parseInt(str.slice(14, 17), 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

        return new Date(year, month, day, hour, minute, second, millis);
    }

    /**
     * Handle stream selection
     */
    handleStreamSelection(selectedStream) {
        if (this.state.currentStream !== selectedStream) {
            if (this.state.currentStream) {
                this.stopStreaming();
            }
            
            this.state.currentStream = selectedStream;

            if (this.state.currentStream) {
                const selectedRoom = this.state.rooms.find(room => room.id === this.state.currentStream);
                this.elements.currentStreamName.textContent = selectedRoom ? selectedRoom.name : 'Unknown Stream';
                this.elements.clearStreamBtn.disabled = false;
                this.elements.stopStreamBtn.disabled = false;

                this.startStreaming();
                this.logToConsole('info', `Selected stream: ${selectedRoom?.name || 'Unknown'}`, selectedRoom, 'events');
            } else {
                this.elements.clearStreamBtn.disabled = true;
                this.elements.stopStreamBtn.disabled = true;
                this.elements.currentStreamName.textContent = 'No stream selected';
            }
        }
    }

    /**
     * Start streaming
     */
    startStreaming() {
        if (!this.state.currentStream || !this.wsClient.isConnected) return;

        this.logToConsole('info', `Starting stream: ${this.state.currentStream}`, null, 'events');
        this.wsClient.joinRoom(this.state.currentStream);
        this.logToConsole('success', `Joined room: ${this.state.currentStream}`, null, 'events');
    }

    /**
     * Stop streaming
     */
    stopStreaming() {
        if (this.state.currentStream) {
            this.wsClient.leaveRoom(this.state.currentStream);
            this.logToConsole('info', `Left room: ${this.state.currentStream}`, null, 'events');
            
            this.state.currentStream = null;
            this.elements.clearStreamBtn.disabled = true;
            this.elements.stopStreamBtn.disabled = true;
            this.elements.currentStreamName.textContent = 'No stream selected';
        }
    }

    /**
     * Clear stream
     */
    clearStream() {
        if (this.wsClient.clearStream(this.state.currentStream)) {
            this.logToConsole('info', `Sent clear audio to ${this.state.currentStream}`, null, 'events');
            this.showToast('Cleared audio stream', 'info');
        }
    }

    /**
     * Mark stream
     */
    markStream() {
        if (this.wsClient.markStream(this.state.currentStream)) {
            this.logToConsole('info', `Marked audio to ${this.state.currentStream}`, null, 'events');
            this.showToast('Marked audio stream', 'info');
        }
    }

    /**
     * Handle PCM audio chunk
     */
    handlePCMAudioChunk(chunk, options = {}) {
        try {
            const { sampleRate = 8000, numChannels = 1, bitsPerSample = 16 } = options;

            if (!chunk.payload) throw new Error('Missing PCM payload');

            // Decode base64 PCM
            const binary = atob(chunk.payload);
            const rawPCM = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                rawPCM[i] = binary.charCodeAt(i);
            }

            const bytesPerSample = bitsPerSample / 8;
            const sampleCount = rawPCM.length / bytesPerSample;
            const audioBuffer = this.audioCtx.createBuffer(numChannels, sampleCount, sampleRate);

            // Fill audio buffer (16-bit signed PCM)
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < sampleCount; i++) {
                const sample = rawPCM[i * 2] | (rawPCM[i * 2 + 1] << 8);
                channelData[i] = sample < 0x8000 ? sample / 32768 : (sample - 65536) / 32768;
            }

            // Create source and schedule
            const source = this.audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioCtx.destination);

            if (this.playTime < this.audioCtx.currentTime) {
                this.playTime = this.audioCtx.currentTime + 0.05; // small safety buffer
            }

            this.logToConsole('audio', 
                `Playing PCM chunk (${rawPCM.length} bytes, ${sampleRate} Hz, ${numChannels} channel(s), ${bitsPerSample}-bit)`,
                null, 'audio');
            
            source.start(this.playTime);
            this.playTime += audioBuffer.duration;
        } catch (err) {
            console.error('PCM chunk playback failed:', err);
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelection(files) {
        this.state.selectedFiles = Array.from(files);
        this.updateFileDisplay();
        this.updateActionButtons();
        this.logToConsole('files', `Selected ${this.state.selectedFiles.length} file(s)`,
            this.state.selectedFiles.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type
            })), 'files');
    }

    /**
     * Update file display
     */
    updateFileDisplay() {
        const display = this.elements.fileInputDisplay;
        const fileName = this.elements.fileName;

        if (this.state.selectedFiles.length > 0) {
            display.classList.add('has-file');
            if (this.state.selectedFiles.length === 1) {
                fileName.textContent = this.state.selectedFiles[0].name;
            } else {
                fileName.textContent = `${this.state.selectedFiles.length} files selected`;
            }
        } else {
            display.classList.remove('has-file');
            fileName.textContent = '';
        }
    }

    /**
     * Update action buttons
     */
    updateActionButtons() {
        const hasFiles = this.state.selectedFiles.length > 0;
        this.elements.clearBtn.disabled = !hasFiles;
        this.elements.doneBtn.disabled = !hasFiles;
    }

    /**
     * Clear file selection
     */
    clearFileSelection() {
        this.state.selectedFiles = [];
        this.elements.fileInput.value = '';
        this.updateFileDisplay();
        this.updateActionButtons();
        this.hideUploadProgress();
        this.logToConsole('files', 'File selection cleared', null, 'files');
        this.showToast('File selection cleared', 'info');
    }

    /**
     * Upload files
     */
    async uploadFiles() {
        if (this.state.selectedFiles.length === 0 || !this.wsClient.isConnected || !this.state.currentStream) {
            this.showToast('No files selected, no room selected, or WebSocket not connected', 'warning');
            return;
        }

        this.showUploadProgress();

        for (let i = 0; i < this.state.selectedFiles.length; i++) {
            const file = this.state.selectedFiles[i];
            await this.uploadSingleFile(file, i + 1, this.state.selectedFiles.length);
        }

        this.hideUploadProgress();
        this.showToast(`Successfully uploaded ${this.state.selectedFiles.length} file(s)`, 'success');
        this.clearFileSelection();
    }

    /**
     * Upload single file
     */
    async uploadSingleFile(file, index, total) {
        const totalChunks = Math.ceil(file.size / this.state.chunkSize);

        this.logToConsole('files', `Uploading file: ${file.name} (${totalChunks} chunks)`,
            { name: file.name, size: file.size, type: file.type }, 'files');

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * this.state.chunkSize;
            const end = Math.min(start + this.state.chunkSize, file.size);
            const chunk = file.slice(start, end);

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(e.target.result)));

                const uploadData = {
                    room_id: this.state.currentStream,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    chunkIndex: chunkIndex,
                    totalChunks: totalChunks,
                    chunkData: base64Data,
                    isComplete: chunkIndex === totalChunks - 1
                };

                this.wsClient.uploadAudioChunk(uploadData);
            };

            reader.readAsArrayBuffer(chunk);

            const progress = (((index - 1) * totalChunks + chunkIndex + 1) / (total * totalChunks)) * 100;
            this.updateUploadProgress(progress);

            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    /**
     * Handle file upload response
     */
    handleFileUploadResponse(response) {
        if (response.success) {
            this.logToConsole('files', `File upload successful: ${response.fileName}`, response, 'files');
        } else {
            this.logToConsole('files', `File upload failed: ${response.fileName} - ${response.error}`, response, 'files');
            this.showToast(`Upload failed: ${response.error}`, 'error');
        }
    }

    /**
     * Show upload progress
     */
    showUploadProgress() {
        this.elements.uploadProgress.classList.add('show');
    }

    /**
     * Hide upload progress
     */
    hideUploadProgress() {
        this.elements.uploadProgress.classList.remove('show');
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
        this.elements.streamSelect.innerHTML = '<option value="">Select a stream</option>';
        
        this.state.rooms.forEach(room => {
            const option = document.createElement('option');
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
            this.elements.connectionStatus.classList.add('connected');
            this.elements.connectionStatus2.classList.add('connected');
            this.elements.statusText.textContent = 'Connected';
        } else {
            this.elements.connectionStatus.classList.remove('connected');
            this.elements.connectionStatus2.classList.add('disconnected');
            this.elements.statusText.textContent = 'Disconnected';
        }
    }

    /**
     * Update audio status
     */
    updateAudioStatus(status) {
        this.elements.audioStatus.textContent = status;
        if (status === 'Playing Audio') {
            this.blinkDot2('audio');
        }
    }

    /**
     * Blink I/O dots
     */
    blinkIODot(direction) {
        const dot = this.elements[direction === 'in' ? 'inDot' : 'outDot'];
        dot.classList.add('active');
        this.blinkDot2(direction === 'in' ? 'inDot' : 'outDot');
        setTimeout(() => dot.classList.remove('active'), 300);
    }

    /**
     * Blink status dot 2
     */
    blinkDot2(dotId) {
        this.elements.connectionStatus2.classList.forEach(cls => {
            if (cls !== 'status-dot2') {
                this.elements.connectionStatus2.classList.remove(cls);
            }
        });
        this.elements.connectionStatus2.classList.add(dotId);
        setTimeout(() => this.elements.connectionStatus2.classList.remove(dotId), 300);
    }

    /**
     * Show room request popup
     */
    showRoomRequestPopup(roomData) {
        if (this.state.currentStream) return; // Skip if already in a room

        this.state.currentRoomRequest = roomData;
        this.playCallTone();

        this.elements.roomPopupName.textContent = roomData.name || 'Unknown Room';
        this.elements.roomPopupDetails.textContent = 
            `Room ID: ${roomData.id || 'N/A'}\nTime: ${new Date(roomData.timestamp).toLocaleString()}`;

        this.elements.roomPopupOverlay.classList.add('show');
        this.elements.roomPopup.classList.add('show');

        this.state.popupTimeout = setTimeout(() => this.dismissRoomPopup(), 15000);

        this.logToConsole('events', `Room request popup shown: ${roomData.name}`, roomData, 'events');
    }

    /**
     * Accept room request
     */
    acceptRoomRequest() {
        if (this.state.currentRoomRequest) {
            this.elements.streamSelect.value = this.state.currentRoomRequest.id;
            this.handleStreamSelection(this.state.currentRoomRequest.id);

            this.logToConsole('success', `Accepted room request: ${this.state.currentRoomRequest.name}`,
                this.state.currentRoomRequest, 'events');
            this.showToast(`Room "${this.state.currentRoomRequest.name}" accepted!`, 'success');
        }
        this.dismissRoomPopup();
    }

    /**
     * Dismiss room popup
     */
    dismissRoomPopup() {
        this.stopCallTone();
        this.elements.roomPopupOverlay.classList.remove('show');
        this.elements.roomPopup.classList.remove('show');

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
        this.elements.packetSize.value = this.state.chunkSize / 1024;
        this.elements.uploadSettingsOverlay.classList.add('show');
        this.elements.uploadSettingsPopup.classList.add('show');
    }

    /**
     * Submit upload settings
     */
    submitUploadSettings() {
        const newSize = parseInt(this.elements.packetSize.value);
        if (newSize > 0) {
            this.state.chunkSize = newSize * 1024;
            this.showToast(`Packet size set to ${newSize} KB`, 'success');
            this.logToConsole('info', `Updated packet size to ${newSize} KB`, null, 'files');
        } else {
            this.showToast('Invalid packet size', 'warning');
        }
        this.dismissUploadSettings();
    }

    /**
     * Dismiss upload settings
     */
    dismissUploadSettings() {
        this.elements.uploadSettingsOverlay.classList.remove('show');
        this.elements.uploadSettingsPopup.classList.remove('show');
    }

    /**
     * Log to console
     */
    logToConsole(type, message, data = null, tab = 'events') {
        this.state.messageCount++;
        this.elements.messageCount.textContent = this.state.messageCount;

        if (tab === 'audio') {
            this.state.audioPacketCount++;
            this.elements.audioPackets.textContent = this.state.audioPacketCount;
        } else if (tab === 'websocket') {
            this.state.wsMessageCount++;
            this.elements.wsMessages.textContent = this.state.wsMessageCount;
        } else if (tab === 'files') {
            this.state.fileUploadCount++;
            this.elements.fileUploadCount.textContent = this.state.fileUploadCount;
        }

        const now = new Date();
        const timestamp = `${now.toLocaleTimeString()}.${now.getMilliseconds().toString().padStart(3, '0')}`;

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
        const logDiv = document.createElement('div');
        logDiv.className = `log-entry ${logEntry.type}`;

        let logData = '';
        if (logEntry.data) {
            logData = `<div class="log-data">${JSON.stringify(logEntry.data, null, 2)}</div>`;
        }

        logDiv.innerHTML = `
            <span class="log-timestamp">${logEntry.timestamp}</span>
            <span class="log-type ${logEntry.type}">${logEntry.type}</span>
            <span class="log-message">${logEntry.message}</span>
            ${logData}
        `;

        this.elements.consoleContent.appendChild(logDiv);
        this.elements.consoleContent.scrollTop = this.elements.consoleContent.scrollHeight;
    }

    /**
     * Switch console tab
     */
    switchTab(tab) {
        this.state.currentTab = tab;
        document.querySelectorAll('.console-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        this.elements.consoleContent.innerHTML = '';
        this.logs[tab].forEach(log => this.renderLogEntry(log));
    }

    /**
     * Clear console
     */
    clearConsole() {
        this.logs[this.state.currentTab] = [];
        this.elements.consoleContent.innerHTML = '';

        if (this.state.currentTab === 'events') {
            this.state.messageCount = 0;
            this.elements.messageCount.textContent = '0';
        } else if (this.state.currentTab === 'audio') {
            this.state.audioPacketCount = 0;
            this.elements.audioPackets.textContent = '0';
        } else if (this.state.currentTab === 'websocket') {
            this.state.wsMessageCount = 0;
            this.elements.wsMessages.textContent = '0';
        } else if (this.state.currentTab === 'files') {
            this.state.fileUploadCount = 0;
            this.elements.fileUploadCount.textContent = '0';
        }

        this.logToConsole('info', 
            `${this.state.currentTab.charAt(0).toUpperCase() + this.state.currentTab.slice(1)} console cleared`,
            null, this.state.currentTab);
    }

    /**
     * Export logs
     */
    exportLogs() {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.logs, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', `console-logs-${new Date().toISOString()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        this.logToConsole('success', 'Logs exported successfully', null, 'events');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const bgColors = {
            success: 'linear-gradient(135deg, #00ff88, #00e676)',
            warning: 'linear-gradient(135deg, #ffb800, #ffa726)',
            error: 'linear-gradient(135deg, #ff4757, #ff3742)',
            info: 'linear-gradient(135deg, #667eea, #764ba2)'
        };

        Toastify({
            text: message,
            duration: 3000,
            backgroundColor: bgColors[type] || bgColors.info
        }).showToast();
    }

    /**
     * Handle keyboard events
     */
    handleKeydown(e) {
        if (e.key === 'Escape') {
            if (this.elements.roomPopupOverlay.classList.contains('show')) {
                this.dismissRoomPopup();
            }
            if (this.elements.uploadSettingsOverlay.classList.contains('show')) {
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

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.streamingApp = new StreamingApp();
});