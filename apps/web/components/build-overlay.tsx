import React from "react";
import { overlayLabel, type BuildSnapshot } from "../lib/build-metadata";

export function BuildOverlay({ snapshot }: { snapshot: BuildSnapshot }) {
  if (!snapshot.showOverlay || !snapshot.build) return null;
  const label = overlayLabel(snapshot.build);
  return (
    <aside className="build-overlay" aria-label="Application build">
      <strong>{label.channel}</strong>
      <span className="build-overlay-version">
        <span className="build-overlay-branch">{label.branch}</span>
        <span> · {label.sha}</span>
      </span>
    </aside>
  );
}
