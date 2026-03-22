import { registerRemotes } from '@module-federation/enhanced/runtime';
import { mergeMfPins } from './mf-remote-overrides';

fetch('/module-federation.manifest.json')
  .then((res) => res.json())
  .then((manifest: Record<string, string>) => mergeMfPins(manifest))
  .then((manifest) =>
    Object.entries(manifest).map(([name, entry]) => ({ name, entry })),
  )
  .then((remotes) => registerRemotes(remotes))
  .then(() => import('./bootstrap').catch((err) => console.error(err)));
