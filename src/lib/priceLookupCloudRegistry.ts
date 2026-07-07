let backupHandler: (() => Promise<void>) | null = null;

export function setCloudBackupHandler(handler: (() => Promise<void>) | null): void {
  backupHandler = handler;
}

export function triggerCloudBackup(): void {
  void backupHandler?.();
}
