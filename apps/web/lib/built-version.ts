import type { BuildSnapshot } from "./build-metadata";

// Next replaces this exact expression with a literal at compilation. Do not
// destructure process.env or read SAMMA_BUILD_* / Git in request-time code.
export const builtVersion: BuildSnapshot = JSON.parse(process.env.SAMMA_COMPILED_BUILD ?? '{"showOverlay":false,"build":null}');
