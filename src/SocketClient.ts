import { EventEmitter } from "eventemitter3";
import { IClientOptions } from "./IClientOptions";
import { createSocketAddress } from "./helpers";
import { CLOSE_GOING_AWAY, CLOSE_NORMAL } from "./CloseCodes";

export const defaultOptions = {
	autoconnect: true,
	debug: true,
	host: 'localhost',
	port: 3000,
	reconnect: true,
	secure: false,
};

export class SocketClient extends EventEmitter {
	public options: IClientOptions;
	public socket: WebSocket;
	public clientId: any;
	public reconnecting: boolean;
	public beforeunloadEventSet: boolean;
	public binaryType: 'blob' | 'arraybuffer';

	/**
	 * Client constructor
	 */
	constructor(options?: IClientOptions) {
		super();

		this.reconnecting = false;
		this.beforeunloadEventSet = false;
		this.socket = null;
		this.clientId = null;

		if (options) {
			this.options = Object.assign(defaultOptions, options);
		} else {
			this.options = defaultOptions;
		}

		if (this.options.autoconnect) {
			this.connect();
		}
	}

	public get status(): number {
		if (this.socket) {
			return this.socket.readyState;
		} else {
			return WebSocket.CLOSED;
		}
	}

	public connect(forceReconnect: boolean = false): void {
		if (!this.socket || forceReconnect) {
			this.socket = null;
			this.socket = new WebSocket(createSocketAddress(this.options));
			this.binaryType = this.socket.binaryType;

			// add socket event listeners
			this.socket.addEventListener(
				"message",
				(event: MessageEvent): void => {
					this.onSocketMessage(event);
				}
			);

			this.socket.addEventListener("error", (event: Event): void => {
				this.onError(event);
			});

			this.socket.addEventListener("open", (event: Event): void => {
				this.onConnect(event);
			});

			this.socket.addEventListener("close", (event: Event): void => {
				this.onDisconnect(event);
			});
		} else {
			console.warn("SocketClient already connected");
		}

		if (!this.beforeunloadEventSet) {
			window.addEventListener("beforeunload", (): void => {
				if (this.socket && this.socket.readyState === WebSocket.OPEN) {
					this.socket.close(CLOSE_GOING_AWAY, "client terminated");
					this.clientId = null;
				}
			});

			this.beforeunloadEventSet = true;
		}
	}

	public disconnect(stopReconnecting: boolean = true): void {
		if (stopReconnecting) {
			this.options.reconnect = false;
		}

		this.socket.close(CLOSE_NORMAL, "client disconnecting");
	}

	public send(payload: any): void {
		const binary = payload instanceof ArrayBuffer || payload instanceof Blob;
		if (this.socket && this.status === WebSocket.OPEN) {
			if (!binary) {
				this.socket.send(JSON.stringify(payload));
			} else {
				this.socket.send(payload);
			}
		}

		this.emit("send");
	}

	// main message handler
	public messageHandler(event: MessageEvent, json: any) {
		this.emit('message', json);
		this.emit('stringMessage', json);
	}

	public binaryMessageHandler(event: MessageEvent) {
		this.emit('message', event.data);
		this.emit('binaryMessage', event.data);
	}

	// event handlers
	public onSocketMessage(event: MessageEvent): void {
		const isBinary = typeof event.data === 'string';
		if (!isBinary) {
			const data = JSON.parse(event.data);
			if (data.type === 'clientid') {
				this.onClientId(event, data);
			} else if (data.type === 'ping') {
				this.onPing(event, data);
			} else {
				this.messageHandler(event, data);
			}
		} else {
			this.binaryMessageHandler(event);
		}
	}

	private onConnect(event: Event): void {
		this.emit('connect', event);
		if (this.reconnecting) {
			this.onReconnect();
			this.reconnecting = false;
		}
		if (this.options.debug) {
			console.log('SocketClient connect', event);
		}
	}

	private onDisconnect(event: Event): void {
		this.emit('disconnect', event);

		if (this.options.debug) {
			console.log('SocketClient disconnect', event);
		}

		this.socket = null;

		if (this.options.reconnect) {
			this.connect();
		}
	}

	private onReconnect(): void {
		this.emit('reconnect');
	}

	private onError(event: Event): void {
		this.emit('error', event);
		console.error('SocketClient error', event);
	}

	private onClientId(event: MessageEvent, json: any) {
		this.clientId = json.message.id;
		this.emit("clientId", this.clientId);
		console.log("SocketClient - clientId", this.clientId);
	}

	private onPing(event: MessageEvent, json: any): void {
		this.emit('ping', json.message);
		this.send({ type: 'pong', message: json.message });
		if (this.options.debug) {
			console.log('SocketClient - ping');
		}
	}
}
