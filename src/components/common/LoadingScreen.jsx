import React from 'react';

const LoadingScreen = ({
  title = 'Loading content',
  subtitle = 'Preparing the experience...',
  variant = 'page',
}) => {
  const immersive = variant === 'immersive';

  return (
    <div
      className={[
        'min-h-screen flex items-center justify-center px-4',
        immersive
          ? 'bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_32%),linear-gradient(135deg,#02040a_0%,#050816_45%,#02040a_100%)] text-white'
          : 'bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_30%),linear-gradient(135deg,#fff7ed_0%,#ffffff_44%,#fff1f2_100%)] text-slate-900',
      ].join(' ')}
    >
      <div
        className={[
          'w-full max-w-xl rounded-[2rem] border p-8 shadow-2xl backdrop-blur-xl',
          immersive ? 'border-white/10 bg-white/5' : 'border-white/60 bg-white/75',
        ].join(' ')}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-current/10 bg-current/5">
            <div className="h-8 w-8 rounded-full border-2 border-current/20 border-t-current animate-spin" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-current/10 to-transparent opacity-70" />
          </div>
          <div>
            <p className={['text-[11px] uppercase tracking-[0.3em]', immersive ? 'text-cyan-200' : 'text-amber-600'].join(' ')}>
              Virtual Art
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          </div>
        </div>

        <p className={['mt-5 text-sm leading-6', immersive ? 'text-slate-300' : 'text-slate-600'].join(' ')}>
          {subtitle}
        </p>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className={[
              'h-full w-2/3 rounded-full animate-pulse',
              immersive
                ? 'bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300'
                : 'bg-gradient-to-r from-amber-400 via-rose-400 to-amber-400',
            ].join(' ')}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-500">
          <span>Loading assets</span>
          <span>Optimizing for your device</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;