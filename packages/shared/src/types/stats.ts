import type {PlaceType} from './place.js';

export interface PersonalStats {
    total: number;
    visited: number;
    pending: number;
    favorites: number;
    threeThousands: { total: number; visited: number };
    byType: { type: PlaceType; total: number; visited: number }[];
    highestPeak: { id: string; name: string; elevation: number } | null;
}
