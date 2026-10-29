import type {Database} from '../src/client.js';

type QueryResponse = unknown;

export function fakeDatabase(responses: QueryResponse[]) {
    let index = 0;
    const calls: string[] = [];
    function query(result: QueryResponse): object {
        const proxy = new Proxy({}, {
            get(_target, property) {
                if (property === 'then') return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
                    Promise.resolve(result).then(resolve, reject);
                if (property === 'catch') return (reject: (reason: unknown) => unknown) => Promise.resolve(result).catch(reject);
                return () => proxy;
            },
        });
        return proxy;
    }
    function next(operation: string) {
        calls.push(operation);
        return responses[index++] ?? [];
    }
    const database = {
        select: () => query(next('select')),
        insert: () => query(next('insert')),
        update: () => query(next('update')),
        delete: () => query(next('delete')),
        execute: async () => next('execute') as {rows: unknown[]},
    } as unknown as Database;
    return {database, calls};
}
