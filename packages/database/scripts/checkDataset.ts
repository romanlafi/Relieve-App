import {loadDataset} from './dataset.js';

const dataset = await loadDataset();
const totals: Record<string, number> = {};
const byType: Record<string, {total: number; missingElevation: number; withDescription: number}> = {};
for (const feature of dataset.places.features) {
    const key = `${feature.properties.region}/${feature.properties.type}`;
    totals[key] = (totals[key] ?? 0) + 1;
    const type = feature.properties.type;
    const quality = byType[type] ??= {total: 0, missingElevation: 0, withDescription: 0};
    quality.total += 1;
    if (feature.properties.elevation === null) quality.missingElevation += 1;
    if (feature.properties.description) quality.withDescription += 1;
}
console.info(JSON.stringify({
    places: dataset.places.features.length,
    regions: dataset.regions.length,
    totals,
    quality: {
        missingElevation: Object.values(byType).reduce((total, row) => total + row.missingElevation, 0),
        withDescription: Object.values(byType).reduce((total, row) => total + row.withDescription, 0),
        byType,
    }
}, null, 2));
