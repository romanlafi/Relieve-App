import {useEffect, useRef, useState} from 'react';
import type {PlaceWithUserState, UpdateUserPlace, UserPlaceState} from '@relieve/shared';
import {placesSchema, userPlaceSchema} from './placeSchemas';

type PlacesState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'success'; places: PlaceWithUserState[] };

export type PersonalSaveState = { placeId: string; status: 'saving' | 'saved' | 'error' } | null;

export function usePlaces() {
    const [state, setState] = useState<PlacesState>({status: 'loading'});
    const [requestVersion, setRequestVersion] = useState(0);
    const [personalSave, setPersonalSave] = useState<PersonalSaveState>(null);
    const mutationController = useRef<AbortController | null>(null);

    useEffect(() => () => {
        mutationController.current?.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function load() {
            try {
                const response = await fetch('/api/places', {
                    signal: controller.signal,
                    headers: {Accept: 'application/json'},
                });
                if (!response.ok) throw new Error('No se han podido cargar los lugares. Comprueba la API y vuelve a intentarlo.');
                const body: unknown = await response.json();
                const parsed = placesSchema.safeParse(body);
                if (!parsed.success) {
                    if (active) setState({status: 'error', message: 'La API ha devuelto datos de lugares no válidos.'});
                    return;
                }
                if (active) setState({status: 'success', places: parsed.data});
            } catch {
                if (active && !controller.signal.aborted) {
                    setState({
                        status: 'error',
                        message: 'No se han podido cargar los lugares. Comprueba la API y vuelve a intentarlo.'
                    });
                }
            }
        }

        void load();
        return () => {
            active = false;
            controller.abort();
        };
    }, [requestVersion]);

    function retry() {
        setState({status: 'loading'});
        setRequestVersion((version) => version + 1);
    }

    async function saveUserPlace(placeId: string, input: UpdateUserPlace | null): Promise<UserPlaceState | null | undefined> {
        if (mutationController.current) return undefined;
        const controller = new AbortController();
        mutationController.current = controller;
        setPersonalSave({placeId, status: 'saving'});
        try {
            const response = await fetch(`/api/user/places/${encodeURIComponent(placeId)}`, {
                method: input === null ? 'DELETE' : 'PUT',
                signal: controller.signal,
                headers: {Accept: 'application/json', ...(input === null ? {} : {'Content-Type': 'application/json'})},
                ...(input === null ? {} : {body: JSON.stringify(input)}),
            });
            if (!response.ok) throw new Error('Unable to save personal place');
            let userState: UserPlaceState | null = null;
            if (input !== null) {
                const saved = userPlaceSchema.parse(await response.json());
                if (saved.placeId !== placeId) throw new Error('Unexpected place ID');
                userState = {
                    status: saved.status,
                    favorite: saved.favorite,
                    visitedAt: saved.visitedAt,
                    notes: saved.notes
                };
            }
            if (controller.signal.aborted) return undefined;
            setState((current) => current.status !== 'success' ? current : {
                ...current, places: current.places.map((place) => place.id === placeId ? {...place, userState} : place),
            });
            setPersonalSave({placeId, status: 'saved'});
            return userState;
        } catch {
            if (!controller.signal.aborted) setPersonalSave({placeId, status: 'error'});
            return undefined;
        } finally {
            mutationController.current = null;
        }
    }

    return {state, retry, personalSave, saveUserPlace};
}
