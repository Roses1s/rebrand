/**
 * Догрузка длинного списка — «Показать ещё N из M», как в рабочей CRM.
 * Пока подгружается следующая порция, кнопка пишет «Загрузка…».
 */
export function ShowMore({ shown, total, step, onMore, loading = false }) {
  if (shown >= total) return null;
  const next = Math.min(step, total - shown);
  return (
    <div className="show-more">
      <button type="button" className="btn btn--sm" disabled={loading} onClick={onMore}>
        {loading ? "Загрузка…" : `Показать ещё ${next} из ${total}`}
      </button>
    </div>
  );
}
