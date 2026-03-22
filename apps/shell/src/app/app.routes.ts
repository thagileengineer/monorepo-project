import { NxWelcome } from './nx-welcome';
import { Route } from '@angular/router';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { ShellComponent } from './shell/shell.component';

const mfeChildRoutes: Route[] = [
  {
    path: 'mfe10',
    loadChildren: () =>
      loadRemote<typeof import('mfe10/Routes')>('mfe10/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe09',
    loadChildren: () =>
      loadRemote<typeof import('mfe09/Routes')>('mfe09/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe08',
    loadChildren: () =>
      loadRemote<typeof import('mfe08/Routes')>('mfe08/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe07',
    loadChildren: () =>
      loadRemote<typeof import('mfe07/Routes')>('mfe07/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe06',
    loadChildren: () =>
      loadRemote<typeof import('mfe06/Routes')>('mfe06/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe05',
    loadChildren: () =>
      loadRemote<typeof import('mfe05/Routes')>('mfe05/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe04',
    loadChildren: () =>
      loadRemote<typeof import('mfe04/Routes')>('mfe04/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe03',
    loadChildren: () =>
      loadRemote<typeof import('mfe03/Routes')>('mfe03/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe02',
    loadChildren: () =>
      loadRemote<typeof import('mfe02/Routes')>('mfe02/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'mfe01',
    loadChildren: () =>
      loadRemote<typeof import('mfe01/Routes')>('mfe01/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: '',
    component: NxWelcome,
  },
];

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellComponent,
    children: mfeChildRoutes,
  },
];
