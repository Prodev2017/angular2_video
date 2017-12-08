import { Injectable }             from '@angular/core';
import { CanActivate, Router,
         ActivatedRouteSnapshot,
         RouterStateSnapshot }    from '@angular/router';
import { AuthService }    from './theme/services/auth';
import { Currency }    from './theme/services/currency';

import { GlobalState } from './global.state';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router, public _state:GlobalState, public currency:Currency) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    this.authService.redirectUrl = state.url;
                          this._state.notifyDataChanged('spinner.show', {});


    return Promise.resolve(this.authService.checkLoginStatus().toPromise().then( (res) => {

      if(res.session) {
            
            this.authService.isLoggedIn = true;
            
            this.authService.authResponse = res;

            return this.currency.getCurrencies().toPromise().then( (data) => {
                this.currency.list = data.Currencies;
                this.currency.getCurrencyLinks();
                                          this._state.notifyDataChanged('spinner.hide', {});

                return res.session;

            });
        


      } else {
                                  this._state.notifyDataChanged('spinner.hide', {});

        this.router.navigate(['/login']);
        return res.session;

      }
    }));

  }
}
