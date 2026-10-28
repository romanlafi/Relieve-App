import {apiFetch} from '../auth/apiFetch';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {PlaceFilters, PlaceWithUserState, UpdateUserPlace, UserPlaceState} from '@relieve/shared';
import {placesSchema, userPlaceSchema} from './placeSchemas';
import {matchesPersonalFilters, placeFiltersQuery} from './placeFilters';

type PlacesState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'success'; places: PlaceWithUserState[]; query: string };

export type PersonalSaveState = { placeId: string; status: 'saving' | 'saved' | 'error' } | null;

export function usePlaces(filters: PlaceFilters) {
    const [state, setState] = useState<PlacesState>({status: 'loading'});
    const [requestVersion, setRequestVersion] = useState(0);
    const [personalSave, setPersonalSave] = useState<PersonalSaveState>(null);
    const [mutationVersion, setMutationVersion] = useState(0);
    const mutationController = useRef<AbortController | null>(null);
    const loadController = useRef<AbortController | null>(null);
    const filtersRef = useRef(filters);
    const query = placeFiltersQuery(filters);
    const lastQuery = useRef(query);

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    useEffect(() => () => {
        mutationController.current?.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadController.current = controller;
        let active = true;

        async function load() {
            try {
                const response = await apiFetch(`/api/places?${query}`, {
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
                if (active) setState({status: 'success', places: parsed.data, query});
            } catch {
                if (active && !controller.signal.aborted) {
                    setState({
                        status: 'error',
                        message: 'No se han podido cargar los lugares. Comprueba la API y vuelve a intentarlo.'
                    });
                }
            }
        }

        if (lastQuery.current !== query) {
            lastQuery.current = query;
            queueMicrotask(() => {
                if (active) setState({status: 'loading'});
            });
        }
        void load();
        return () => {
            active = false;
            controller.abort();
        };
    }, [requestVersion, query]);

    const visitsChanged = useCallback(() => {
        loadController.current?.abort();
        setMutationVersion((version) => version + 1);
        setRequestVersion((version) => version + 1);
    }, []);

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
            const response = await apiFetch(`/api/user/places/${encodeURIComponent(placeId)}`, {
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
            loadController.current?.abort();
            setState((current) => current.status !== 'success' ? current : {
                ...current, places: current.places.map((place) => place.id === placeId ? {...place, userState} : place)
                    .filter((place) => matchesPersonalFilters(place, filtersRef.current)),
            });
            setPersonalSave({placeId, status: 'saved'});
            setMutationVersion((version) => version + 1);
            setRequestVersion((version) => version + 1);
            return userState;
        } catch {
            if (!controller.signal.aborted) setPersonalSave({placeId, status: 'error'});
            return undefined;
        } finally {
            mutationController.current = null;
        }
    }

    return {state, retry, personalSave, saveUserPlace, mutationVersion, visitsChanged};
}
