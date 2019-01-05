export function createSocketAddress(options: any): string {
	return `${options.secure ? 'wss' : 'ws'}://${options.host}${options.port ? ':' : ''}${options.port}`;
}
