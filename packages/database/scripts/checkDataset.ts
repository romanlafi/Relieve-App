import {loadDataset} from './dataset.js';

const dataset = await loadDataset();
const totals: Record<string, number> = {};
for (const feature of dataset.places.features) {
    const key = `${feature.properties.region}/${feature.properties.type}`;
    totals[key] = (totals[key] ?? 0) + 1;
}
console.info(JSON.stringify({
    places: dataset.places.features.length,
    regions: dataset.regions.length,
    totals
}, null, 2));
