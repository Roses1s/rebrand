/**
 * Пилюля тега: пастельный фон и насыщенный текст того же тона.
 * Цвет тега — любой HEX, как в рабочей CRM; светлый и тёмный варианты
 * считаются в CSS через `color-mix`, поэтому пилюля читается в обеих темах.
 */
export function TagChip({ name, color, size = "sm", children }) {
  return (
    <span className={`tag-chip tag-chip--${size}`} style={{ "--tag": color }} title={name}>
      <span className="tag-chip__name">{name}</span>
      {children}
    </span>
  );
}

/** Ряд тегов лида по их id; неизвестные id (удалённый тег) пропускаются. */
export function TagList({ ids = [], tags, size = "sm" }) {
  const list = ids.map((id) => tags.find((tag) => tag.id === id)).filter(Boolean);
  if (!list.length) return null;
  return (
    <span className="tag-list">
      {list.map((tag) => (
        <TagChip key={tag.id} name={tag.name} color={tag.color} size={size} />
      ))}
    </span>
  );
}
