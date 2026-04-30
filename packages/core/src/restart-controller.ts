export type RestartOutcome = "restarted" | "unsupported" | "failed";

export interface RestartController {
  canRestart(): Promise<boolean>;
  restart(reason: string): Promise<RestartOutcome>;
}

export class NoopRestartController implements RestartController {
  async canRestart(): Promise<boolean> {
    return false;
  }

  async restart(): Promise<RestartOutcome> {
    return "unsupported";
  }
}
