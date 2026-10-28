import {apiFetch} from '../auth/apiFetch';
import {useState} from 'react';
import type {FormEvent} from 'react';
import type {PlaceType, PlaceWithUserState, Region} from '@relieve/shared';
import * as styles from './PlaceCatalogForm.css';
import {Icon} from '../ui/Icon';

interface Props {
    place: PlaceWithUserState;
    regions: Region[];
    onSaved: () => void;
}

const typeLabels: Record<PlaceType, string> = {
    peak: 'Pico', lake: 'Ibón', hut: 'Refugio', pass: 'Collado', viewpoint: 'Mirador',
};

export function PlaceCatalogForm({place, regions, onSaved}: Props) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (saving) return;
        const form = new FormData(event.currentTarget);
        const elevation = String(form.get('elevation') ?? '').trim();
        const regionId = String(form.get('regionId') ?? '');
        setSaving(true);
        setError('');
        try {
            const response = await apiFetch(`/api/places/${encodeURIComponent(place.id)}`, {
                method: 'PUT',
                headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: form.get('name'),
                    type: form.get('type'),
                    elevation: elevation ? Number(elevation) : null,
                    latitude: Number(form.get('latitude')),
                    longitude: Number(form.get('longitude')),
                    regionId: regionId || null,
                    description: String(form.get('description') ?? '').trim() || null,
                }),
            });
            if (!response.ok) throw new Error('No se han podido guardar los datos del catálogo.');
            setEditing(false);
            onSaved();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Error al guardar el lugar.');
        } finally {
            setSaving(false);
        }
    }

    return <section className={styles.section} aria-label="Catálogo global">
        <h3 className={styles.heading}>Catálogo global</h3>
        {!editing ? <button className={styles.button} type="button" onClick={() => setEditing(true)}>
            <Icon name="edit" size={16}/>Editar datos del lugar
        </button> : <form onSubmit={(event) => void save(event)}>
            <fieldset className={styles.fields} disabled={saving}>
                <legend className={styles.message}>Estos cambios afectan a todas las cuentas.</legend>
                <label className={styles.field}>Nombre
                    <input className={styles.control} name="name" required maxLength={200} defaultValue={place.name}/>
                </label>
                <label className={styles.field}>Tipo
                    <select className={styles.control} name="type" defaultValue={place.type}>
                        {Object.entries(typeLabels).map(([type, label]) =>
                            <option key={type} value={type}>{label}</option>)}
                    </select>
                </label>
                <label className={styles.field}>Altitud (m)
                    <input className={styles.control} name="elevation" type="number" min={-500} max={9000}
                           step={1} defaultValue={place.elevation ?? ''}/>
                </label>
                <label className={styles.field}>Región
                    <select className={styles.control} name="regionId" defaultValue={place.regionId ?? ''}>
                        <option value="">Sin región</option>
                        {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
                    </select>
                </label>
                <label className={styles.field}>Latitud
                    <input className={styles.control} name="latitude" type="number" min={-90} max={90}
                           step="any" required defaultValue={place.latitude}/>
                </label>
                <label className={styles.field}>Longitud
                    <input className={styles.control} name="longitude" type="number" min={-180} max={180}
                           step="any" required defaultValue={place.longitude}/>
                </label>
                <label className={styles.field}>Descripción
                    <textarea className={styles.control} name="description" maxLength={2000}
                              defaultValue={place.description ?? ''}/>
                </label>
                {error && <p className={styles.message} role="alert">{error}</p>}
                <div className={styles.actions}>
                    <button className={styles.primaryButton} type="submit" disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar catálogo'}
                    </button>
                    <button className={styles.button} type="button" disabled={saving} onClick={() => {
                        setEditing(false);
                        setError('');
                    }}>Cancelar</button>
                </div>
            </fieldset>
        </form>}
    </section>;
}
