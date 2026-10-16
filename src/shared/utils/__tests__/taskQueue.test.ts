import { createTaskQueue, TaskCancelledError } from '../taskQueue';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

describe('createTaskQueue', () => {
  it('never runs more tasks than the concurrency limit', async () => {
    const queue = createTaskQueue(2);
    const gates = [deferred<string>(), deferred<string>(), deferred<string>()];
    const started: number[] = [];

    const results = gates.map(
      (gate, index) =>
        queue.enqueue(() => {
          started.push(index);
          return gate.promise;
        }).promise,
    );

    await flush();
    expect(started).toEqual([0, 1]);
    expect(queue.pendingCount).toBe(1);

    gates[0].resolve('a');
    await flush();
    expect(started).toEqual([0, 1, 2]);

    gates[1].resolve('b');
    gates[2].resolve('c');
    await expect(Promise.all(results)).resolves.toEqual(['a', 'b', 'c']);
  });

  it('drops a cancelled task before it starts and rejects its promise', async () => {
    const queue = createTaskQueue(1);
    const blocker = deferred<void>();
    const skipped = jest.fn(async () => 'never');

    queue.enqueue(() => blocker.promise);
    const cancelled = queue.enqueue(skipped);
    cancelled.cancel();

    await expect(cancelled.promise).rejects.toBeInstanceOf(TaskCancelledError);
    blocker.resolve();
    await flush();
    expect(skipped).not.toHaveBeenCalled();
  });

  it('starts the newest waiting task first in lifo order', async () => {
    const queue = createTaskQueue(1, { order: 'lifo' });
    const blocker = deferred<void>();
    const started: string[] = [];
    const track = (name: string) => async () => {
      started.push(name);
    };

    queue.enqueue(() => blocker.promise);
    const older = queue.enqueue(track('older'));
    const newer = queue.enqueue(track('newer'));
    blocker.resolve();
    await Promise.all([older.promise, newer.promise]);

    expect(started).toEqual(['newer', 'older']);
  });

  it('releases the slot when a task throws synchronously', async () => {
    const queue = createTaskQueue(1);
    const failing = queue.enqueue(() => {
      throw new Error('boom');
    });
    const next = queue.enqueue(async () => 'ok');

    await expect(failing.promise).rejects.toThrow('boom');
    await expect(next.promise).resolves.toBe('ok');
  });
});
