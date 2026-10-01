export type PlaceType = 'peak' | 'lake' | 'hut' | 'pass' | 'viewpoint';
export type PlaceStatus = 'pending' | 'visited';

export interface Place {
    id: string;
    name: string;
    slug: string;
    type: PlaceType;
    elevation: number | null;
    latitude: number;
    longitude: number;
}
