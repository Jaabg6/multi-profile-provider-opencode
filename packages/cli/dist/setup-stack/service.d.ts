import type { SetupArgs, SetupDeps, SetupPlan, SetupResult } from "./types.js";
export declare function createSetupPlan(argsInput: Partial<SetupArgs>, _deps: SetupDeps): Promise<SetupPlan>;
export declare function executeSetupPlan(plan: SetupPlan, deps: SetupDeps): Promise<SetupResult>;
export declare function runSetupStack(args: Partial<SetupArgs>, deps: SetupDeps): Promise<SetupResult>;
