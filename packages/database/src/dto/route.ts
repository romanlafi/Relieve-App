import type {RouteSummary} from '@relieve/shared';

type SummaryRow = Omit<RouteSummary, 'startedAt' | 'endedAt' | 'createdAt' | 'updatedAt' | 'durationSeconds'> & {
    startedAt: Date | null; endedAt: Date | null; createdAt: Date; updatedAt: Date;
};
export function toRouteSummary(row: SummaryRow): RouteSummary {
    return {...row, startedAt: row.startedAt?.toISOString() ?? null, endedAt: row.endedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
        durationSeconds: row.startedAt && row.endedAt ? (row.endedAt.getTime() - row.startedAt.getTime()) / 1000 : null};
}
