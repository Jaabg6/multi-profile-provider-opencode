export class NoopRestartController {
    async canRestart() {
        return false;
    }
    async restart() {
        return "unsupported";
    }
}
//# sourceMappingURL=restart-controller.js.map