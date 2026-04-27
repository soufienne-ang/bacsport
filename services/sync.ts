import api from './api';

const SYNC_KEY = 'bac_sport_last_sync';
const PENDING_QUEUE_KEY = 'bac_sport_sync_queue';
const OFFLINE_MODE_KEY = 'bac_sport_offline_mode';

export interface SyncEntry {
  id: string;
  entityType: 'student' | 'performance' | 'config' | 'settings';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data?: unknown;
  timestamp: number;
  userId?: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.setupListeners();
    this.loadOfflineMode();
  }

  private setupListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processPendingQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  private loadOfflineMode(): void {
    const stored = localStorage.getItem(OFFLINE_MODE_KEY);
    if (stored) {
      // Can be used to force offline mode
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  onConnectivityChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  getLastSyncTimestamp(): number {
    const stored = localStorage.getItem(SYNC_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  private setLastSyncTimestamp(timestamp: number): void {
    localStorage.setItem(SYNC_KEY, timestamp.toString());
  }

  getPendingQueue(): SyncEntry[] {
    const stored = localStorage.getItem(PENDING_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private savePendingQueue(queue: SyncEntry[]): void {
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
  }

  addToPendingQueue(entry: Omit<SyncEntry, 'id' | 'timestamp'>): void {
    const queue = this.getPendingQueue();
    queue.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    this.savePendingQueue(queue);
  }

  private async processPendingQueue(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress or offline'] };
    }

    this.syncInProgress = true;
    const queue = this.getPendingQueue();

    if (queue.length === 0) {
      this.syncInProgress = false;
      return { success: true, synced: 0, failed: 0, errors: [] };
    }

    try {
      const response = await api.post<{ processed: number; failed: number; errors: string[] }>('/sync', {
        entries: queue,
      });

      if (response.success && response.data) {
        const synced = queue.length - response.data.failed;
        this.savePendingQueue([]);
        this.syncInProgress = false;
        return {
          success: true,
          synced,
          failed: response.data.failed,
          errors: response.data.errors,
        };
      }

      this.syncInProgress = false;
      return { success: false, synced: 0, failed: queue.length, errors: [response.error || 'Sync failed'] };
    } catch (error) {
      this.syncInProgress = false;
      return {
        success: false,
        synced: 0,
        failed: queue.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async pullChanges(): Promise<{ entries: SyncEntry[]; serverTimestamp: number } | null> {
    if (!this.isOnline) return null;

    try {
      const lastSync = this.getLastSyncTimestamp();
      const response = await api.get<{ entries: SyncEntry[]; serverTimestamp: number }>(`/sync?since=${lastSync}`);

      if (response.success && response.data) {
        this.setLastSyncTimestamp(response.data.serverTimestamp);
        return response.data;
      }

      return null;
    } catch {
      return null;
    }
  }

  async fullSync(): Promise<{
    students: unknown[];
    config: unknown;
    settings: Record<string, string>;
    activeConfigVersion: number;
    timestamp: number;
  } | null> {
    if (!this.isOnline) return null;

    try {
      const response = await api.get<{
        students: unknown[];
        config: unknown;
        settings: Record<string, string>;
        activeConfigVersion: number;
        timestamp: number;
      }>('/sync/full');

      if (response.success && response.data) {
        this.setLastSyncTimestamp(response.data.timestamp);
        return response.data;
      }

      return null;
    } catch {
      return null;
    }
  }

  async sync(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, synced: 0, failed: 0, errors: ['Offline'] };
    }

    await this.processPendingQueue();
    const pullResult = await this.pullChanges();

    return {
      success: true,
      synced: pullResult?.entries.length || 0,
      failed: 0,
      errors: [],
    };
  }

  clearSyncData(): void {
    localStorage.removeItem(SYNC_KEY);
    localStorage.removeItem(PENDING_QUEUE_KEY);
  }
}

export const syncService = new SyncService();
export default syncService;
