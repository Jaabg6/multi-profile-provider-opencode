export declare function readJsonFile(filePath: string): Promise<unknown | undefined>;
export declare function createBackup(filePath: string, now: Date, forceFail?: boolean): Promise<string>;
export declare function writeJsonFile(filePath: string, value: unknown): Promise<void>;
