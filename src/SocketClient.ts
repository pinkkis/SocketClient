import * as EventEmitter from 'eventemitter3';
import { IClientOptions } from './IClientOptions';
import { createSocketAddress } from './helpers';
import { CLOSE_GOING_AWAY, CLOSE_NORMAL } from './CloseCodes';

export const defaultOptions = {
	host: 'localhost',
	port: 3000,
	secure: false,
	autoconnect: true,
	reconnect: true,
	debug: true
};

export class SocketClient extends EventEmitter {
	options: IClientOptions;
	socket: WebSocket;
	clientId: any;
	reconnecting: boolean;
	beforeunloadEventSet: boolean;
	binaryType: "blob"|"arraybuffer";

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

	get status(): number {
		if (this.socket) {
			return this.socket.readyState;
		} else {
			return WebSocket.CLOSED;
		}
	}

	connect(forceReconnect: boolean = false): void {
		if (!this.socket || forceReconnect) {
			this.socket = null;
			this.socket = new WebSocket(createSocketAddress(this.options));
			this.binaryType = this.socket.binaryType;

			// add socket event listeners
			this.socket.addEventListener('message', (event: MessageEvent): void => {
				this.onSocketMessage(event);
			});

			this.socket.addEventListener('error', (event: Event): void => {
				this.onError(event);
			});

			this.socket.addEventListener('open', (event: Event): void => {
				this.onConnect(event);
			});

			this.socket.addEventListener('close', (event: Event): void => {
				this.onDisconnect(event);
			});
		} else {
			console.warn('SocketClient already connected');
		}

		if (!this.beforeunloadEventSet) {
			window.addEventListener('beforeunload', (): void => {
				if (this.socket && this.socket.readyState === WebSocket.OPEN) {
					this.socket.close(CLOSE_GOING_AWAY, 'client terminated');
					this.clientId = null;
				}
			});

			this.beforeunloadEventSet = true;
		}
	}

	disconnect(stopReconnecting: boolean = true): void {
		if (stopReconnecting) {
			this.options.reconnect = false;
		}

		this.socket.close(CLOSE_NORMAL, 'client disconnecting');
	}

	send(payload: any): void {
		let binary = payload instanceof ArrayBuffer || payload instanceof Blob;
		if (this.socket && this.status === WebSocket.OPEN) {
			if (!binary) {
				this.socket.send(JSON.stringify(payload));
			} else {
				this.socket.send(payload);
			}
		}

		this.emit('send');
	}

	// main message handler
	messageHandler(event: MessageEvent, json: any) {
		this.emit('message', json);
		this.emit('stringMessage', json);
	}

	binaryMessageHandler(event: MessageEvent) {
		this.emit('message', event.data);
		this.emit('binaryMessage', event.data);
	}

	// event handlers
	onSocketMessage(event: MessageEvent): void {
		let isBinary = typeof event.data === "string";
		if (!isBinary) {
			let data = JSON.parse(event.data);
			if (data.type === 'clientid') {
				this.onClientId(event, data);
			} else if ( data.type === 'ping') {
				this.onPing(event, data);
			} else {
				this.messageHandler(event, data);
			}
		} else {
			this.binaryMessageHandler(event);
		}
	}

	onConnect(event: Event): void {
		this.emit('connect', event);
		if (this.reconnecting) {
			this.onReconnect();
			this.reconnecting = false;
		}
		this.options.debug && console.log('SocketClient connect', event)
	}

	onDisconnect(event: Event): void {
		this.emit('disconnect', event);
		this.options.debug && console.log('SocketClient disconnect', event);

		this.socket = null;

		if (this.options.reconnect) {
			this.connect();
		}
	}

	onReconnect(): void {
		this.emit('reconnect');
	}

	onError(event: Event): void {
		this.emit('error', event);
		console.error('SocketClient error', event);
	}

	onClientId(event: MessageEvent, json: any) {
		this.clientId = json.message.id;
		this.emit('clientId', this.clientId);
		console.log('SocketClient - clientId', this.clientId);
	}

	onPing(event: MessageEvent, json: any): void {
		this.emit('ping', json.message);
		this.send({type: 'pong', message: json.message});
		this.options.debug && console.log('SocketClient - ping');
	}
}
