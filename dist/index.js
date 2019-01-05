define(["require", "exports", "eventemitter3", "./helpers", "./CloseCodes"], function (require, exports, EventEmitter, helpers_1, CloseCodes_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const defaultOptions = {
        host: 'localhost',
        port: 3000,
        secure: false,
        autoconnect: true,
        reconnect: true,
        debug: true
    };
    class SocketClient extends EventEmitter {
        /**
         * Client constructor
         */
        constructor(options) {
            super();
            this.reconnecting = false;
            this.beforeunloadEventSet = false;
            this.socket = null;
            this.clientId = null;
            if (options) {
                this.options = Object.assign(defaultOptions, options);
            }
            else {
                this.options = defaultOptions;
            }
            if (this.options.autoconnect) {
                this.connect();
            }
        }
        get status() {
            if (this.socket) {
                return this.socket.readyState;
            }
            else {
                return WebSocket.CLOSED;
            }
        }
        connect(forceReconnect = false) {
            if (!this.socket || forceReconnect) {
                this.socket = null;
                this.socket = new WebSocket(helpers_1.createSocketAddress(this.options));
                this.binaryType = this.socket.binaryType;
                // add socket event listeners
                this.socket.addEventListener('message', (event) => {
                    this.onSocketMessage(event);
                });
                this.socket.addEventListener('error', (event) => {
                    this.onError(event);
                });
                this.socket.addEventListener('open', (event) => {
                    this.onConnect(event);
                });
                this.socket.addEventListener('close', (event) => {
                    this.onDisconnect(event);
                });
            }
            else {
                console.warn('SocketClient already connected');
            }
            if (!this.beforeunloadEventSet) {
                window.addEventListener('beforeunload', () => {
                    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                        this.socket.close(CloseCodes_1.CLOSE_GOING_AWAY, 'client terminated');
                        this.clientId = null;
                    }
                });
                this.beforeunloadEventSet = true;
            }
        }
        disconnect(stopReconnecting = true) {
            if (stopReconnecting) {
                this.options.reconnect = false;
            }
            this.socket.close(CloseCodes_1.CLOSE_NORMAL, 'client disconnecting');
        }
        send(payload) {
            let binary = payload instanceof ArrayBuffer || payload instanceof Blob;
            if (this.socket && this.status === WebSocket.OPEN) {
                if (!binary) {
                    this.socket.send(JSON.stringify(payload));
                }
                else {
                    this.socket.send(payload);
                }
            }
            this.emit('send');
        }
        // main message handler
        messageHandler(event, json) {
            this.emit('message', json);
            this.emit('stringMessage', json);
        }
        binaryMessageHandler(event) {
            this.emit('message', event.data);
            this.emit('binaryMessage', event.data);
        }
        // event handlers
        onSocketMessage(event) {
            let isBinary = typeof event.data === "string";
            if (!isBinary) {
                let data = JSON.parse(event.data);
                if (data.type === 'clientid') {
                    this.onClientId(event, data);
                }
                else if (data.type === 'ping') {
                    this.onPing(event, data);
                }
                else {
                    this.messageHandler(event, data);
                }
            }
            else {
                this.binaryMessageHandler(event);
            }
        }
        onConnect(event) {
            this.emit('connect', event);
            if (this.reconnecting) {
                this.onReconnect();
                this.reconnecting = false;
            }
            this.options.debug && console.log('SocketClient connect', event);
        }
        onDisconnect(event) {
            this.emit('disconnect', event);
            this.options.debug && console.log('SocketClient disconnect', event);
            this.socket = null;
            if (this.options.reconnect) {
                this.connect();
            }
        }
        onReconnect() {
            this.emit('reconnect');
        }
        onError(event) {
            this.emit('error', event);
            console.error('SocketClient error', event);
        }
        onClientId(event, json) {
            this.clientId = json.message.id;
            this.emit('clientId', this.clientId);
            console.log('SocketClient - clientId', this.clientId);
        }
        onPing(event, json) {
            this.emit('ping', json.message);
            this.send({ type: 'pong', message: json.message });
            this.options.debug && console.log('SocketClient - ping');
        }
    }
    exports.default = SocketClient;
});
