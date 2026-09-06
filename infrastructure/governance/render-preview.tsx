// Generate a static, empty-state visual artifact. Never reads the database or bypasses a route guard.
import React from "react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { GovernanceUsers } from "../../apps/web/components/governance-users";
import { BuildOverlay } from "../../apps/web/components/build-overlay";
import { buildSnapshot } from "../../apps/web/lib/build-metadata";

const snapshot = buildSnapshot(process.env);
if (snapshot.build?.channel !== "experiment" || !snapshot.showOverlay) throw new Error("Experiment overlay required");
const css = readFileSync(new URL("../../apps/web/app/globals.css", import.meta.url), "utf8");
const markup = renderToStaticMarkup(<><header className="site-header"><div className="site-header-inner"><a href="/" className="brand"><strong>SAMMA</strong><span>Employment Records &amp; Document Management</span></a><span className="dev-ribbon">Visual preview · No user data</span></div></header><GovernanceUsers result={{ users: [], page: 1, query: "", hasNext: false, view: "all" }} /><BuildOverlay snapshot={snapshot} /></>);
const directory = new URL("../../apps/web/public/experiment-preview/", import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL("users.html", directory), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SAMMA Users — visual preview</title><style>${css}</style></head><body data-build-overlay="true">${markup}<script>document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();document.getElementById('preview-note').textContent='Search is available in the authenticated Governance directory after DEV approval.'});</script><p id="preview-note" class="page-shell muted" role="status">Empty-state visual preview. Live user search and detail require Governance login on DEV after approval.</p></body></html>`);
