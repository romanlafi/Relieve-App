import {MapView} from './map/MapView';
import * as styles from './App.css';
import {AuthProvider} from './auth/AuthProvider';
import {useAuth} from './auth/authContext';
import {AuthDialog} from './auth/AccountPanel';

function Atlas() {
    const auth = useAuth();
    return <main className={styles.page}>
        <MapView key={auth.user?.id ?? 'anonymous'}/>
        {auth.dialog && <AuthDialog/>}
    </main>;
}

export function App() {
    return (
        <AuthProvider><Atlas/></AuthProvider>
    );
}
