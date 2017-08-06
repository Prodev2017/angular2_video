/*
 * Angular
 */

import { Injector, ReflectiveInjector } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { Account } from './account.service';
import {HTTP_PROVIDERS} from '@angular/http';

/*
 * Services
 */

 export const IsLoggedIn = true;
  /*= (next: ComponentInstruction, previous: ComponentInstruction) => {
  let injector = appInjector();
  let account: Account = injector.get(Account);
  let router: Router = injector.get(Router);

  return new Promise((resolve) => {
	  account.checkAuth()
	      .subscribe((result) => {
					if (result) {
						resolve(true);
					} else {
						router.navigate(['/Login']);
						resolve(false);
					}
				});
  });

}
*/
