export class TaskCancelledError extends Error {
  constructor() {
    super('Task cancelled before it started');
    this.name = 'TaskCancelledError';
  }
}

export interface QueuedTask<T> {
  promise: Promise<T>;
  /** Drops the task if it has not started yet; a running task is left to finish. */
  cancel: () => void;
}

interface Entry {
  start: () => void;
  reject: (error: Error) => void;
}

/**
 * Runs async tasks with bounded concurrency. Used so that list rows scrolled off-screen
 * can withdraw expensive native work (thumbnail extraction) before it begins.
 */
export function createTaskQueue(concurrency: number) {
  const pending: Entry[] = [];
  let running = 0;

  const pump = () => {
    while (running < concurrency && pending.length > 0) {
      const entry = pending.shift()!;
      running += 1;
      entry.start();
    }
  };

  function enqueue<T>(task: () => Promise<T>): QueuedTask<T> {
    let entry!: Entry;
    const promise = new Promise<T>((resolve, reject) => {
      entry = {
        reject,
        start: () => {
          // Routing through a resolved promise turns a synchronous throw into a rejection,
          // so the concurrency slot is always released.
          Promise.resolve()
            .then(task)
            .then(resolve, reject)
            .finally(() => {
              running -= 1;
              pump();
            });
        },
      };
    });
    pending.push(entry);
    pump();

    return {
      promise,
      cancel: () => {
        const index = pending.indexOf(entry);
        if (index !== -1) {
          pending.splice(index, 1);
          entry.reject(new TaskCancelledError());
        }
      },
    };
  }

  return {
    enqueue,
    get pendingCount() {
      return pending.length;
    },
  };
}
