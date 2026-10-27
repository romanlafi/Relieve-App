import {iconPaths, type IconName} from './iconPaths';

export function Icon({name, size = 18, className}: {name: IconName; size?: number; className?: string}) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                focusable="false" className={className} style={{flexShrink: 0}}>
        <path d={iconPaths[name]} fill={name === 'star' ? 'currentColor' : undefined}/>
    </svg>;
}
