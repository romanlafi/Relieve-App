import type {PlaceType} from './place.js';
import type {RegionType} from './region.js';

export interface PersonalStats {
    total: number;
    visited: number;
    pending: number;
    favorites: number;
    threeThousands: { total: number; visited: number };
    byType: { type: PlaceType; total: number; visited: number }[];
    byRegion: {
        id: string;
        name: string;
        slug: string;
        type: RegionType;
        total: number;
        visited: number;
        pending: number;
        favorites: number;
    }[];
    byYear: { year: number; visited: number }[];
    highestPeak: { id: string; name: string; elevation: number } | null;
}
