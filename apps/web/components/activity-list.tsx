import type { ActivityEvent } from "@samma/domain";

export function ActivityList({ events }: { readonly events: readonly ActivityEvent[] }) {
  if (events.length === 0) return <p className="muted">No recent activity.</p>;

  return (
    <div className="stack">
      {events.map((event) => (
        <div className="record-row" key={event.id}>
          <div className="record-title">
            <strong>{event.summary}</strong>
            <span className="record-meta">
              {event.type.replaceAll("_", " ")} · {new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurredAt))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
