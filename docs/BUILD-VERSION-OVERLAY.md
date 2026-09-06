# Build version overlay

`SAMMA_SHOW_BUILD_OVERLAY=true` explicitly enables a restrained bottom-right
badge and the `build: { channel, branch, sha }` field on `/api/health`.
Default: disabled, including when `NODE_ENV=development`. The NUC uses a
production Next build, so `NODE_ENV` does not determine the release channel.

Build inputs:

- `SAMMA_BUILD_BRANCH`: `dev`, `experiment/<name>` or `main`.
- `SAMMA_BUILD_SHA`: the full 40-character lowercase Git commit SHA.
- `SAMMA_BUILD_CHANNEL`: `dev`, `experiment` or `rc`; inferred from branch if omitted,
  rejected if inconsistent.
- `SAMMA_SHOW_BUILD_OVERLAY`: only the literal `true` enables publication.

Next configuration compiles an explicit allowlisted snapshot into application
code. Both the root layout and dynamic health handler import that same literal.
Neither reads Git nor these input variables at request time. Even runtime
`SAMMA_COMPILED_BUILD` overrides cannot replace the compiled expression.
Next's [build-time env replacement](https://nextjs.org/docs/pages/api-reference/config/next-config-js/env)
is used only for this public snapshot; secrets are never added to `env` config.
Missing metadata is permitted when the overlay is disabled; partial, malformed
or contradictory metadata fails the build. Disabled builds omit health metadata.

UI labels are DEV / EXPERIMENT / RC. The experiment prefix is removed in the
compact badge; health retains the full branch and SHA. No tooltip or interactive
control is added: the badge lets pointer events pass through, stays below the
header, reserves bottom page space, truncates long branches, and respects safe
area margins. It is hidden when printing.

## NUC / isolated candidate build

Check host RAM/CPU/disk headroom first. Use a **clean, committed, isolated
worktree**, with separate `node_modules` and `.next` directories; never symlink
these to the running application. Supply the existing approved digest-pinned
Node image as `SAMMA_NODE_IMAGE` (an image reference, not credentials), then run:

```sh
infrastructure/docker/build-candidate.sh
```

The script refuses the canonical live checkout, captures branch/full SHA from
its own source checkout, rejects dirty or detached checkouts and unsupported
branches, and overrides stale caller-supplied metadata. It runs `npm ci` and the
production build in a disposable container limited to 2 GiB RAM and 0.5 CPU,
using synthetic build configuration. It does not access runtime secrets, the
live Next cache, databases, storage, or public routing. Overlay publication is
explicitly enabled by this DEV/candidate build procedure. Set
`SAMMA_SHOW_BUILD_OVERLAY=false` before invoking it to produce a hidden build.

For another bounded build runner, the metadata launcher is reusable:

```sh
node scripts/with-build-metadata.mjs <build-command> <arguments...>
```

It passes the four build variables to the child environment; container runners
must forward them using `-e SAMMA_BUILD_BRANCH -e SAMMA_BUILD_SHA
-e SAMMA_BUILD_CHANNEL -e SAMMA_SHOW_BUILD_OVERLAY`. Archive/CI builds without
Git may inject all metadata directly into `npm run build`; the pipeline is
responsible for those values matching its immutable source checkout.

After approved deployment, compare `/api/health`'s full SHA and branch with the
validated candidate. Deploy the validated `.next` output with matching
source/dependencies; never relabel an old cache by editing environment or Git.
Restarting requires no metadata injection. Visibility changes require a rebuild.
A previous deployed build at `0bc1660` remains that build even if the canonical
checkout moves to `67c2a89`; this feature cannot retroactively add a badge to an
older artifact that does not contain it. No live rebuild or deployment is part
of the overlay experiment.

## Validation

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
The overlay tests cover labels, shortening, explicit visibility, invalid inputs
and environment allowlisting. The browser verification script checks a running
candidate at desktop 1440, tablet 768 and mobile 390 widths, long branch names,
scroll positions, important controls and public health metadata. Run it with
`PLAYWRIGHT_MODULE` pointing to an installed Playwright package and
`SAMMA_CANDIDATE_URL` pointing to a loopback candidate. It uses synthetic public
pages only and never signs in or touches persisted records.
