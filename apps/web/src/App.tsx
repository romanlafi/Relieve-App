import {useState} from 'react';
import * as styles from './App.css';

export function App() {
    const [count, setCount] = useState(0);

    return (
        <main className={styles.page}>
            <h1 className={styles.title}>Relieve</h1>
            <p>Bootstrap inicial con React, TypeScript y Vanilla Extract.</p>
            <button
                className={styles.button}
                type="button"
                onClick={() => setCount((current) => current + 1)}
            >
                Probar React: {count}
            </button>
        </main>
    );
}
