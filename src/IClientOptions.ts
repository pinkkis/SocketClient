export default interface IClientOptions {
	host: string;
	port: number|string;
	secure: boolean;
	autoconnect: boolean;
	reconnect: boolean;
	debug: boolean;
}
