/**
 * Premium page header used at the top of every protected route.
 * Renders a small eyebrow tag, big gradient title, optional subtitle,
 * and an optional `actions` slot on the right.
 */
export default function PageHeader({ eyebrow, title, subtitle, icon: Icon, actions, accent = 'cyan' }) {
  const accentMap = {
    cyan:    'from-cyan-300/15 to-cyan-500/0  text-cyan-200',
    fuchsia: 'from-fuchsia-300/15 to-fuchsia-500/0 text-fuchsia-200',
    amber:   'from-amber-300/15 to-amber-500/0 text-amber-200',
    violet:  'from-violet-300/15 to-violet-500/0 text-violet-200',
  };
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <div className={`hidden sm:flex h-12 w-12 shrink-0 rounded-2xl items-center justify-center
                          border border-white/10 bg-gradient-to-br ${accentMap[accent]}`}>
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          <h1 className="font-display text-2xl lg:text-[28px] font-bold tracking-tight gradient-text-subtle truncate">
            {title}
          </h1>
          {subtitle && <p className="text-slate-500 text-sm mt-1 max-w-2xl">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
