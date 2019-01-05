define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function createSocketAddress(options) {
        return `${options.secure ? 'wss' : 'ws'}://${options.host}${options.port ? ':' : ''}${options.port}`;
    }
    exports.createSocketAddress = createSocketAddress;
});
