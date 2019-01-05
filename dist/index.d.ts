import * as EventEmitter from 'eventemitter3';
import IClientOptions from './IClientOptions';
export default class SocketClient extends EventEmitter {
    options: IClientOptions;
    socket: WebSocket;
    clientId: any;
    reconnecting: boolean;
    beforeunloadEventSet: boolean;
    binaryType: "blob" | "arraybuffer";
    /**
     * Client constructor
     */
    constructor(options?: IClientOptions);
    readonly status: number;
    connect(forceReconnect?: boolean): void;
    disconnect(stopReconnecting?: boolean): void;
    send(payload: any): void;
    messageHandler(event: MessageEvent, json: any): void;
    binaryMessageHandler(event: MessageEvent): void;
    onSocketMessage(event: MessageEvent): void;
    onConnect(event: Event): void;
    onDisconnect(event: Event): void;
    onReconnect(): void;
    onError(event: Event): void;
    onClientId(event: MessageEvent, json: any): void;
    onPing(event: MessageEvent, json: any): void;
}
