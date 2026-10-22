import {useEffect, useState} from 'react';
import {z} from 'zod';

const accessSchema = z.object({canEditCatalog: z.boolean()});

export function useCatalogAccess() {
    const [canEditCatalog, setCanEditCatalog] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        void fetch('/api/me', {signal: controller.signal, headers: {Accept: 'application/json'}})
            .then(async (response) => {
                if (!response.ok) return null;
                return accessSchema.safeParse(await response.json());
            })
            .then((result) => {
                if (!controller.signal.aborted && result?.success) setCanEditCatalog(result.data.canEditCatalog);
            })
            .catch(() => {});
        return () => controller.abort();
    }, []);
    return canEditCatalog;
}
