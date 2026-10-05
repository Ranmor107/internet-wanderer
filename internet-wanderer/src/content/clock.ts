export interface ContentRuntime {
  readonly isDemo: boolean;
  readonly label: 'Demo' | 'Live';
  /** The bundled content's actual generation time, never a simulated update. */
  readonly snapshotDate?: string;
  now(): number;
}

/** UI clock only. Domain functions keep their real-time defaults. */
export function createContentRuntime(
  mode: unknown,
  generatedAt: unknown,
  wallClock: () => number = () => Date.now(),
): ContentRuntime {
  const isDemo = mode !== 'live';
  const parsed = typeof generatedAt === 'string' ? Date.parse(generatedAt) : Number.NaN;
  const hasSnapshotDate = Number.isFinite(parsed);
  // Empty snapshots can lack generatedAt. Freeze one real reference time then,
  // but do not claim that fallback is a successful content update.
  const referenceTime = hasSnapshotDate ? parsed : isDemo ? wallClock() : undefined;
  return {
    isDemo,
    label: isDemo ? 'Demo' : 'Live',
    ...(hasSnapshotDate ? { snapshotDate: new Date(parsed).toISOString() } : {}),
    now: isDemo ? () => referenceTime! : wallClock,
  };
}

