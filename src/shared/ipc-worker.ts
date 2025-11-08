import { IPC_CHANNELS } from './ipc-channels.js';
import type {
  IndexCompleteEvent,
  IndexProgressEvent,
  IndexWorkerPayload
} from './models/indexing.js';

export type MainToWorkerMessage =
  | {
      type: typeof IPC_CHANNELS.INDEX_START;
      payload: IndexWorkerPayload;
    }
  | {
      type: typeof IPC_CHANNELS.INDEX_CANCEL;
      payload: { jobId: string };
    };

export type WorkerToMainMessage =
  | { type: typeof IPC_CHANNELS.INDEX_PROGRESS; payload: IndexProgressEvent }
  | { type: typeof IPC_CHANNELS.INDEX_COMPLETE; payload: IndexCompleteEvent }
  | { type: typeof IPC_CHANNELS.INDEX_ERROR; payload: { jobId?: string; message: string } };
