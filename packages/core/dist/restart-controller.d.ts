export type RestartOutcome = "restarted" | "unsupported" | "failed";
export interface RestartController {
    canRestart(): Promise<boolean>;
    restart(reason: string): Promise<RestartOutcome>;
}
export declare class NoopRestartController implements RestartController {
    canRestart(): Promise<boolean>;
    restart(): Promise<RestartOutcome>;
}
