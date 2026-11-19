export function Avatar({ nick, color, dimmed, ring }: { nick: string; color: string; dimmed?: boolean; ring?: string }) {
  return (
    <span
      className="avatar"
      title={nick}
      style={{ background: dimmed ? 'var(--line-strong)' : color, color: dimmed ? 'var(--ink)' : '#fff', boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    >
      {nick.slice(0, 1).toUpperCase()}
    </span>
  );
}
