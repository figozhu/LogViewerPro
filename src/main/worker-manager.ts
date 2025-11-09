import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { MainToWorkerMessage, WorkerToMainMessage } from '@shared/ipc-worker';
import { logger } from './logger';

type RendererForwarder = (channel: string, payload: unknown) => void;

/**
 * 负责创建、管理与重启 Worker 线程，确保索引任务的稳定运行。
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private restartAttempts = 0;
  private readonly maxRestartAttempts = 3;
  private restarting = false;
  private messageHandlers: Array<(message: WorkerToMainMessage) => void> = [];

  constructor(private readonly forwardToRenderer: RendererForwarder) {}

  /**
   * 确保 Worker 已经启动，如果未启动则立即创建。
   */
  public ensure(): Worker {
    if (this.worker) {
      return this.worker;
    }

    const workerEntry = this.getWorkerPath();
    const betterSqlite3Path = this.getBetterSqlite3Path();
    const worker = new Worker(pathToFileURL(workerEntry), {
      workerData: { betterSqlite3Path }
    });
    logger.info('Worker thread created', { workerEntry, betterSqlite3Path });
    this.worker = worker;
    this.bindWorker(worker);
    return worker;
  }

  /**
   * 获取 worker 文件的正确路径
   */
  private getWorkerPath(): string {
    if (app.isPackaged) {
      // 打包环境：worker 在 resources/worker 目录
      return join(process.resourcesPath, 'worker', 'worker', 'index.js');
    }
    // 开发环境：从 dist/main 到 dist/worker/worker
    return join(__dirname, '..', 'worker', 'worker', 'index.js');
  }

  /**
   * 获取 better-sqlite3 模块的正确路径
   */
  private getBetterSqlite3Path(): string {
    if (app.isPackaged) {
      // 打包环境：better-sqlite3 在 app.asar.unpacked/node_modules
      return join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3');
    }
    // 开发环境：使用正常的 node_modules
    return 'better-sqlite3';
  }

  /**
   * 对外暴露的消息发送接口，内部自动确保 Worker 可用。
   */
  public sendCommand(message: MainToWorkerMessage): void {
    const worker = this.ensure();
    worker.postMessage(message);
  }

  /**
   * 主动终止 Worker，通常在应用退出时调用。
   */
  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * 注册额外的 Worker 消息处理器（在转发给 Renderer 前触发）。
   */
  public onMessage(handler: (message: WorkerToMainMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  private bindWorker(worker: Worker): void {
    worker.once('online', () => {
      this.restartAttempts = 0;
      this.restarting = false;
      logger.info('Worker thread online');
    });

    worker.on('message', (payload: WorkerToMainMessage) => {
      this.messageHandlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          logger.error('Worker message handler error', error);
        }
      });
      this.forwardToRenderer(payload.type, payload.payload);
    });

    worker.on('error', (error) => {
      logger.error('Worker thread error', error);
      this.forwardToRenderer(IPC_CHANNELS.INDEX_ERROR, { message: error.message });
      this.scheduleRestart('worker error');
    });

    worker.on('exit', (code) => {
      logger.warn('Worker thread exited', { code });
      this.worker = null;
      if (code === 0) {
        this.restartAttempts = 0;
        return;
      }
      this.forwardToRenderer(IPC_CHANNELS.INDEX_ERROR, {
        message: `Worker exited unexpectedly (code=${code ?? 'unknown'})`
      });
      this.scheduleRestart('exit');
    });
  }

  private scheduleRestart(reason: string): void {
    if (this.restarting) {
      return;
    }
    if (this.restartAttempts >= this.maxRestartAttempts) {
      this.forwardToRenderer(IPC_CHANNELS.INDEX_ERROR, {
        message: `Worker restart attempts exceeded due to ${reason}`
      });
      return;
    }

    this.restarting = true;
    const delay = Math.min(5000, 1000 * 2 ** this.restartAttempts);
    this.restartAttempts += 1;
    logger.warn('Scheduling worker restart', { delay, reason, attempts: this.restartAttempts });

    setTimeout(() => {
      this.restarting = false;
      try {
        this.ensure();
        logger.info('Worker restart attempt success', { attempt: this.restartAttempts });
      } catch (error) {
        this.forwardToRenderer(IPC_CHANNELS.INDEX_ERROR, {
          message: `Worker restart failed: ${(error as Error).message}`
        });
        logger.error('Worker restart failure', error);
        this.scheduleRestart('restart failure');
      }
    }, delay);
  }
}
