import type { ReactNode } from 'react';
import { Globe2, PanelsTopLeft } from 'lucide-react';
import type { Mode } from '../domain/modes';
import { getExperienceTheme, themeStyle, type ExperienceTheme } from '../ui/themes';
import '../styles/themes.css';

export interface BrowserFrameProps {
  children: ReactNode;
  mode?: Mode;
  year?: number;
  address?: string;
  label?: string;
  className?: string;
  theme?: ExperienceTheme;
}

export default function BrowserFrame({ children, mode = 'surprise', year, address = 'somewhere.on.the.internet', label, className = '', theme: suppliedTheme }: BrowserFrameProps) {
  const theme = suppliedTheme ?? getExperienceTheme(mode, year);
  return <div className={`browser-frame ${className}`.trim()} data-mode={mode} data-era={theme.era} data-theme={theme.id} style={themeStyle(theme)} data-skin={theme.skin} data-motion={theme.motion} role="group" aria-label={label ?? theme.label}>
    <div className="browser-frame__chrome">
      <span className="browser-frame__dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="browser-frame__address" title={address}><Globe2 size={11} strokeWidth={1.6} aria-hidden="true" /><span>{address}</span></span>
      <span className="browser-frame__window" aria-hidden="true"><PanelsTopLeft size={13} strokeWidth={1.5} /></span>
    </div>
    {children}
  </div>;
}
