import type {Database} from './client.js';
import {users} from './schema/index.js';

export async function resolveAccessUser(database: Database, subject: string, name: string): Promise<string> {
    const [user] = await database.insert(users).values({accessSubject: subject, name})
        .onConflictDoUpdate({target: users.accessSubject, set: {name}}).returning({id: users.id});
    if (!user) throw new Error('Unable to resolve authenticated user');
    return user.id;
}
