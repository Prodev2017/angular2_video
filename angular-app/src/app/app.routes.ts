import { WebpackAsyncRoute } from '@angularclass/webpack-toolkit';
import { Routes, RouterModule } from '@angular/router';

import { Container } from './container';
import { NoContent } from './no-content';
import { TableHolder } from './table-holder';
import { DataResolver } from './app.resolver';

// AngularClass
import { provideWebpack } from '@angularclass/webpack-toolkit';
import { providePrefetchIdleCallbacks } from '@angularclass/request-idle-callback';

export const ROUTES: Routes = [
  { path: '',      component: Container },
  { path: '**',    component: NoContent },
];

// Async load a component using Webpack's require with es6-promise-loader and webpack `require`
// asyncRoutes is needed for our @angularclass/webpack-toolkit that will allow us to resolve
// the component correctly

const asyncRoutes: AsyncRoutes = {
  // we have to use the alternative syntax for es6-promise-loader to grab the routes
};


// Optimizations for initial loads
// An array of callbacks to be invoked after bootstrap to prefetch async routes
const prefetchRouteCallbacks: Array<IdleCallbacks> = [
   // es6-promise-loader returns a function
];


// Es6PromiseLoader and AsyncRoutes interfaces are defined in custom-typings


export const ROUTING_PROVIDERS = [
  provideWebpack(asyncRoutes),
  providePrefetchIdleCallbacks(prefetchRouteCallbacks)
];
