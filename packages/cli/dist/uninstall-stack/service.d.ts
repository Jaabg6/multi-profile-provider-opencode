import type { UninstallDeps, UninstallPlan, UninstallStackArgs } from "./types.js";
export declare function createUninstallPlan(argsInput: Partial<UninstallStackArgs>, deps: UninstallDeps): Promise<UninstallPlan>;
export declare function executeUninstallPlan(plan: UninstallPlan, deps: UninstallDeps): Promise<void>;
