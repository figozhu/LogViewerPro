import { parentPort, type MessagePort } from 'node:worker_threads';
import type { MainToWorkerMessage } from '@shared/ipc-worker';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type {
  IndexCompleteEvent,
  IndexProgressEvent,
  IndexWorkerPayload
} from '@shared/models/indexing';
import { SchemaBuilder } from './db/schema-builder';
import { LogIndexer } from './db/log-indexer';

const activeJobs = new Map<string, LogIndexer>();

const bootstrapWorker = () => {
  const port = parentPort;
  if (!port) {
    throw new Error('当前线程不是 worker 线程，无法启动索引引擎');
  }

  port.on('message', (message: MainToWorkerMessage) => {
    if (message?.type === IPC_CHANNELS.INDEX_START) {
      handleIndexStart(port, message.payload);
      return;
    }

    if (message?.type === IPC_CHANNELS.INDEX_CANCEL) {
      cancelJob(message.payload.jobId);
      return;
    }

    port.postMessage({
      type: IPC_CHANNELS.INDEX_ERROR,
      payload: {
        message: `未识别的 Worker 消息类型: ${message?.['type'] ?? 'unknown'}`
      }
    });
  });

  process.on('uncaughtException', (error) => {
    port.postMessage({
      type: IPC_CHANNELS.INDEX_ERROR,
      payload: {
        message: `Worker uncaught exception: ${error.message}`
      }
    });
  });

  process.on('unhandledRejection', (reason) => {
    port.postMessage({
      type: IPC_CHANNELS.INDEX_ERROR,
      payload: {
        message: `Worker unhandled rejection: ${formatReason(reason)}`
      }
    });
  });
};

const handleIndexStart = async (port: MessagePort, payload: IndexWorkerPayload) => {
  try {
    const builder = new SchemaBuilder(payload.template, payload.cacheInfo);
    const columns = builder.build();
    const indexer = new LogIndexer(payload.filePath, payload.template, payload.cacheInfo, columns);
    activeJobs.set(payload.jobId, indexer);
    port.postMessage({
      type: IPC_CHANNELS.INDEX_PROGRESS,
      payload: {
        jobId: payload.jobId,
        phase: 'preparing',
        progress: 5
      } satisfies IndexProgressEvent
    });
    const result = await indexer.run((progress) => {
      port.postMessage({
        type: IPC_CHANNELS.INDEX_PROGRESS,
        payload: { jobId: payload.jobId, phase: 'parsing', progress } satisfies IndexProgressEvent
      });
    });
    activeJobs.delete(payload.jobId);
    const completePayload: IndexCompleteEvent = {
      jobId: payload.jobId,
      cacheUsed: false,
      cancelled: result.cancelled,
      inserted: result.inserted,
      skipped: result.skipped,
      unmatched: result.unmatchedSamples
    };
    port.postMessage({
      type: IPC_CHANNELS.INDEX_COMPLETE,
      payload: completePayload
    });
  } catch (error) {
    activeJobs.delete(payload.jobId);
    parentPort?.postMessage({
      type: IPC_CHANNELS.INDEX_ERROR,
      payload: {
        jobId: payload.jobId,
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }
};

const cancelJob = (jobId: string) => {
  const job = activeJobs.get(jobId);
  if (job) {
    job.cancel();
  }
  activeJobs.delete(jobId);
};

const formatReason = (reason: unknown): string => {
  if (reason instanceof Error) {
    return reason.stack ?? reason.message;
  }
  if (typeof reason === 'string') {
    return reason;
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
};

bootstrapWorker();
