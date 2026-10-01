export type RegionType = 'mountain_system' | 'sector' | 'massif' | 'valley';

export interface Region {
    id: string;
    name: string;
    slug: string;
    type: RegionType;
    parentId: string | null;
}
