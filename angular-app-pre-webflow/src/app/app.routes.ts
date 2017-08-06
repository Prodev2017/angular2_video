import { RouterConfig } from '@angular/router';
import { MemberHome } from './memberHome';
import { Home } from './home';

import { AccountLogin } from './accountLogin';
import { AccountRegistration } from './accountRegistration';
import { NoContent } from './no-content';
import { AuthGuard } from './account/authGuard.service';

export const routes: RouterConfig = [
  { path: 'home', component: Home },
  { path: '', component: Home },
  { path: 'member', component: MemberHome, canActivate: [AuthGuard] },
  { path: 'login',  component: AccountLogin },
  { path: 'register',  component: AccountRegistration },

  // make sure you match the component type string to the require in asyncRoutes
  { path: 'about', component: 'About' },
  { path: '**',    component: NoContent },
];

// Async load a component using Webpack's require with es6-promise-loader and webpack `require`
// asyncRoutes is needed for our @angularclass/webpack-toolkit that will allow us to resolve
// the component correctly
export const asyncRoutes: AsyncRoutes = {
  'About': require('es6-promise-loader!./about')
};


// Optimizations for initial loads
// An array of callbacks to be invoked after bootstrap to prefetch async routes
export const prefetchRouteCallbacks: Array<Es6PromiseLoader | Function> = [
  asyncRoutes['About'] // es6-promise-loader returns a function
];


// Es6PromiseLoader and AsyncRoutes interfaces are defined in custom-typings
