import {useState} from 'react';
import type {PlaceStatus, PlaceWithUserState, UpdateUserPlace, UserPlaceState} from '@relieve/shared';
import type {PersonalSaveState} from './usePlaces';
import * as styles from './PlacePersonalForm.css';

interface Props {
    place: PlaceWithUserState;
    saveState: PersonalSaveState;
    onSave: (placeId: string, input: UpdateUserPlace | null) => Promise<UserPlaceState | null | undefined>;
}

export function PlacePersonalForm({place, saveState, onSave}: Props) {
    const [status, setStatus] = useState<PlaceStatus | ''>(place.userState?.status ?? '');
    const [favorite, setFavorite] = useState(place.userState?.favorite ?? false);
    const [visitedAt, setVisitedAt] = useState(place.userState?.visitedAt ?? '');
    const [notes, setNotes] = useState(place.userState?.notes ?? '');
    const busy = saveState?.status === 'saving';
    const currentSave = saveState?.placeId === place.id ? saveState.status : null;
    const hasChanges = status !== (place.userState?.status ?? '')
        || favorite !== (place.userState?.favorite ?? false)
        || visitedAt !== (place.userState?.visitedAt ?? '')
        || notes !== (place.userState?.notes ?? '');

    async function save(remove = false) {
        if (busy || (!remove && (!status || !hasChanges))) return;
        const saved = await onSave(place.id, remove ? null : {
            status: status || 'pending', favorite, notes: notes || null,
            visitedAt: status === 'visited' ? visitedAt || null : null,
        });
        if (saved !== undefined) {
            setStatus(saved?.status ?? '');
            setFavorite(saved?.favorite ?? false);
            setVisitedAt(saved?.visitedAt ?? '');
            setNotes(saved?.notes ?? '');
        }
    }

    return <form className={styles.form} onSubmit={(event) => {
        event.preventDefault();
        void save();
    }}>
        <p className={styles.message}>Estado guardado: {place.userState?.status === 'visited' ? 'Visitado'
            : place.userState?.status === 'pending' ? 'Pendiente' : 'Sin registrar'}{place.userState?.favorite ? ' · Favorito' : ''}</p>
        <fieldset className={styles.fields} disabled={busy}>
            <legend className={styles.message}>Mi registro personal</legend>
            <label className={styles.field}>Estado personal
                <select className={styles.control} value={status} onChange={(event) => {
                    const next = event.target.value as PlaceStatus | '';
                    setStatus(next);
                    if (next !== 'visited') setVisitedAt('');
                }}>
                    <option value="" disabled>Sin registrar</option>
                    <option value="pending">Pendiente</option>
                    <option value="visited">Visitado</option>
                </select>
            </label>
            <label className={styles.checkbox}>
                <input type="checkbox" checked={favorite} disabled={!status}
                       onChange={(event) => setFavorite(event.target.checked)}/> Favorito
            </label>
            <label className={styles.field}>Fecha de visita
                <input className={styles.control} type="date" value={visitedAt} disabled={status !== 'visited'}
                       onChange={(event) => setVisitedAt(event.target.value)}/>
            </label>
            <label className={styles.field}>Notas
                <textarea className={styles.notes} value={notes} maxLength={5000} disabled={!status}
                          onChange={(event) => setNotes(event.target.value)}/>
            </label>
            <p className={styles.message}>Al pasar a pendiente se elimina la fecha, no el favorito ni las notas.</p>
            <div className={styles.actions}>
                <button className={styles.button} type="submit" disabled={!status || !hasChanges}>Guardar</button>
                <button className={styles.button} type="button" disabled={!place.userState}
                        onClick={() => void save(true)}>
                    Quitar registro
                </button>
            </div>
        </fieldset>
        <p className={styles.message} role="status" aria-live="polite">
            {currentSave === 'saving' ? 'Guardando…'
                : currentSave === 'error' ? 'No se han podido guardar los cambios. Tu borrador se conserva; vuelve a intentarlo.'
                    : hasChanges ? 'Cambios sin guardar.' : currentSave === 'saved' ? 'Cambios guardados.' : ''}
        </p>
    </form>;
}
