import {useEffect, useRef, useState} from 'react';
import {useAuth} from './authContext';
import {Icon} from '../ui/Icon';
import {announceSessionChange} from './apiFetch';
import * as mapStyles from '../map/MapView.css';
import * as styles from './AccountPanel.css';

const errors: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: 'El correo o la contraseña no son correctos.',
    EMAIL_NOT_VERIFIED: 'Confirma tu correo con el código que te hemos enviado.',
    USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese correo. Prueba a iniciar sesión.',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya existe una cuenta con ese correo. Prueba a iniciar sesión.',
    INVALID_OTP: 'El código no es correcto. Revísalo o solicita uno nuevo.',
    OTP_EXPIRED: 'El código ha caducado. Solicita uno nuevo.',
    TOO_MANY_ATTEMPTS: 'Has hecho demasiados intentos. Espera un momento antes de volver a probar.',
    PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
    INVALID_AUTH_INPUT: 'Revisa los datos del formulario.',
};
class AuthError extends Error {
    constructor(public code: string, status: number) {
        super(status === 429 ? 'Demasiados intentos. Espera un momento y vuelve a probar.'
            : errors[code] ?? 'No se ha podido completar la operación. Vuelve a intentarlo.');
    }
}
async function authRequest(path: string, body: object) {
    const response = await fetch(`/api/auth${path}`, {method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    const result = await response.json().catch(() => ({error: {code: 'AUTH_UNAVAILABLE'}}));
    if (!response.ok) throw new AuthError(result.error?.code ?? 'AUTH_FAILED', response.status);
    return result as {success: boolean; requiresVerification?: boolean};
}

export function SignInPrompt({children}: {children?: string}) {
    const auth = useAuth();
    return <div className={styles.account}>
        <p className={styles.message}>{children ?? 'Guarda tus favoritos, registra visitas y lleva tus rutas contigo.'}</p>
        {auth.authAvailable && <button type="button" className={mapStyles.button} onClick={() => auth.open('signup')}>Crear mi cuenta</button>}
    </div>;
}

export function AccountPanel() {
    const auth = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function signOut() {
        setBusy(true); setError('');
        try { await authRequest('/sign-out', {}); await auth.refresh(); announceSessionChange(); }
        catch { setError('No se ha podido cerrar la sesión. Vuelve a intentarlo.'); }
        finally { setBusy(false); }
    }
    return <div className={styles.account}>
        {auth.status === 'loading' ? <p className={styles.message}>Comprobando sesión…</p>
            : auth.status === 'error' ? <>
                <p className={styles.message}>No se ha podido comprobar la sesión.</p>
                <button className={styles.link} onClick={() => void auth.refresh().catch(() => {})}>Reintentar</button>
            </> : auth.authenticated ? <>
                <p className={styles.name}><Icon name="user" size={17}/>{auth.user?.name}</p>
                {auth.authAvailable && <button className={styles.link} disabled={busy} onClick={() => void signOut()}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>}
            </> : auth.authAvailable && <>
                <p className={styles.message}>Tu cuenta para guardar lugares, visitas y rutas.</p>
                <div className={styles.actions}>
                    <button className={mapStyles.primaryButton} onClick={() => auth.open()}>Iniciar sesión</button>
                    <button className={mapStyles.button} onClick={() => auth.open('signup')}>Crear cuenta</button>
                </div>
            </>}
        {error && <p className={styles.message} role="alert">{error}</p>}
    </div>;
}

export function AuthDialog() {
    const auth = useAuth();
    const [step, setStep] = useState<'signin' | 'signup' | 'verify' | 'forgot' | 'reset'>(auth.dialog ?? 'signin');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [resendAfter, setResendAfter] = useState(0);
    const dialog = useRef<HTMLDialogElement>(null);
    const lock = useRef(false);
    useEffect(() => {
        dialog.current?.showModal();
        dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    }, [step]);
    const titles = {signin: 'Bienvenido a Relieve', signup: 'Crea tu cuenta', verify: 'Confirma tu correo', forgot: 'Recupera tu cuenta', reset: 'Elige una nueva contraseña'};
    function changeStep(next: typeof step) { setStep(next); setMessage(''); setPassword(''); setCode(''); }
    async function complete(verified = false) {
        const identity = await auth.refresh();
        if (identity.authenticated) { announceSessionChange(); auth.close(); }
        else if (verified) { changeStep('signin'); setMessage('Correo confirmado. Ya puedes iniciar sesión.'); }
        else throw new Error('No se ha podido guardar la sesión. Comprueba que tu navegador permita cookies y vuelve a intentarlo.');
    }
    async function submit() {
        if (lock.current) return;
        lock.current = true; setBusy(true); setMessage('');
        try {
            if (step === 'signin') {
                await authRequest('/sign-in/email', {email: email.trim(), password});
                await complete();
            } else if (step === 'signup') {
                const result = await authRequest('/sign-up/email', {email: email.trim(), password, name: name.trim()});
                setPassword('');
                if (result.requiresVerification) { setStep('verify'); setResendAfter(Date.now() + 30000); }
                else await complete();
            } else if (step === 'verify') {
                await authRequest('/email-otp/verify-email', {email: email.trim(), otp: code});
                await complete(true);
            } else if (step === 'forgot') {
                await authRequest('/email-otp/request-password-reset', {email: email.trim()});
                setStep('reset'); setResendAfter(Date.now() + 30000);
            } else {
                await authRequest('/email-otp/reset-password', {email: email.trim(), otp: code, password});
                changeStep('signin'); setMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
            }
        } catch (error) {
            if (error instanceof AuthError && error.code === 'EMAIL_NOT_VERIFIED') {
                setStep('verify'); setPassword(''); setResendAfter(Date.now() + 30000);
            }
            setMessage(error instanceof Error ? error.message : 'No se ha podido conectar. Vuelve a intentarlo.');
        } finally { lock.current = false; setBusy(false); }
    }
    async function resend() {
        if (lock.current) return;
        if (Date.now() < resendAfter) { setMessage('Espera unos segundos antes de pedir otro código.'); return; }
        lock.current = true; setBusy(true);
        try {
            await authRequest(step === 'reset' ? '/email-otp/request-password-reset' : '/email-otp/send-verification-otp',
                step === 'reset' ? {email: email.trim()} : {email: email.trim(), type: 'email-verification'});
            setResendAfter(Date.now() + 30000); setMessage('Hemos enviado otro código. Revisa también la carpeta de spam.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'No se ha podido enviar el código.'); }
        finally { lock.current = false; setBusy(false); }
    }
    const needsCode = step === 'verify' || step === 'reset';
    const needsPassword = step === 'signin' || step === 'signup' || step === 'reset';
    return <dialog ref={dialog} className={styles.dialog} aria-labelledby="auth-title" onCancel={auth.close}>
        <div className={styles.heading}>
            <h2 id="auth-title" className={styles.title}>{titles[step]}</h2>
            <button type="button" className={mapStyles.iconButton} aria-label="Cerrar acceso" onClick={auth.close}><Icon name="close" size={18}/></button>
        </div>
        <p className={styles.message}>{step === 'signin' || step === 'signup'
            ? 'Tus lugares, tus visitas y tus rutas. Todo guardado en tu cuenta.'
            : step === 'forgot' ? 'Te enviaremos un código para cambiar tu contraseña.'
                : step === 'verify' ? `Introduce el código de 6 cifras enviado a ${email}.`
                    : `Si hay una cuenta con ${email}, recibirás un código para recuperar el acceso.`}</p>
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            {step === 'signup' && <label className={styles.label}>Nombre
                <input className={styles.input} name="name" autoComplete="nickname" required maxLength={80} value={name} disabled={busy} onChange={(e) => setName(e.target.value)}/>
            </label>}
            {!needsCode && <label className={styles.label}>Correo electrónico
                <input className={styles.input} type="email" name="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)}/>
            </label>}
            {needsCode && <label className={styles.label}>Código de verificación
                <input className={styles.input} name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}/>
            </label>}
            {needsPassword && <div className={styles.label}>
                <label htmlFor="auth-password">{step === 'reset' ? 'Nueva contraseña' : 'Contraseña'}</label>
                <input id="auth-password" className={styles.input} type={showPassword ? 'text' : 'password'} name="password" autoComplete={step === 'signin' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} value={password} disabled={busy} onChange={(e) => setPassword(e.target.value)}/>
                <button className={styles.link} type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button>
                {step !== 'signin' && <span className={styles.message}>Al menos 8 caracteres.</span>}
            </div>}
            {message && <p className={styles.notice} role="status" aria-live="polite">{message}</p>}
            <button className={mapStyles.primaryButton} type="submit" disabled={busy}>{busy ? 'Un momento…'
                : step === 'signin' ? 'Iniciar sesión' : step === 'signup' ? 'Crear cuenta'
                    : step === 'verify' ? 'Confirmar correo' : step === 'forgot' ? 'Enviar código' : 'Guardar contraseña'}</button>
            {step === 'signin' && <button type="button" className={styles.link} disabled={busy} onClick={() => changeStep('forgot')}>He olvidado mi contraseña</button>}
            {needsCode && <button type="button" className={styles.link} disabled={busy} onClick={() => void resend()}>Enviar otro código</button>}
            <button type="button" className={styles.link} disabled={busy} onClick={() => changeStep(step === 'signin' ? 'signup' : 'signin')}>
                {step === 'signin' ? '¿Primera vez? Crea tu cuenta' : 'Volver a iniciar sesión'}
            </button>
        </form>
    </dialog>;
}
