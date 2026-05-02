import fs from "node:fs/promises";
import path from "node:path";
export async function readJsonFile(filePath) {
    try {
        const raw = await fs.readFile(filePath, "utf8");
        return JSON.parse(raw.replace(/^\uFEFF/, ""));
    }
    catch {
        return undefined;
    }
}
export async function createBackup(filePath, now, forceFail = false) {
    if (forceFail) {
        throw new Error(`backup failed for ${filePath}`);
    }
    const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const backupPath = `${filePath}.backup-${stamp}`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.copyFile(filePath, backupPath);
    return backupPath;
}
export async function writeJsonFile(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
//# sourceMappingURL=json.js.map