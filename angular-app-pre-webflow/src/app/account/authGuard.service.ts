import { Injectable }  from '@angular/core';
import { CanActivate,
         Router,
         ActivatedRouteSnapshot,
         RouterStateSnapshot }    from '@angular/router';
import { Account } from './account.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private account: Account, private router: Router) {}

  canActivate(
    // Not using but worth knowing about
    next:  ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    if (this.account.loggedIn) {
      console.log('logged in',this.account.loggedIn);
      return true;
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }
}


/*
Copyright 2016 Google Inc. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/