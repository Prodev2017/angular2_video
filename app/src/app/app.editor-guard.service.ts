import { Injectable }             from '@angular/core';
import { CanActivate, Router,
         ActivatedRouteSnapshot,
         RouterStateSnapshot }    from '@angular/router';
import { AuthService }    from './theme/services/auth';
import { Account } from './theme/services/account';
import { GlobalState } from './global.state';

@Injectable()
export class EditorGuard implements CanActivate {

  constructor(private authService: AuthService, public account:Account, private router: Router, public _state:GlobalState) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    this.authService.redirectUrl = state.url;
                          this._state.notifyDataChanged('spinner.show', {});

    return Promise.resolve(this.authService.checkLoginStatus().toPromise().then( (res) => {

      if(res.session) {
        
        this.authService.isLoggedIn = true;
        this.authService.authResponse = res;
        var isEditor = this.authService.authResponse.profileData.userRole == 'editor';
        
        if(isEditor) {
                                    this._state.notifyDataChanged('spinner.hide', {});

          return isEditor;
          
        } else {
                                    this._state.notifyDataChanged('spinner.hide', {});

          this.router.navigate(['/pages/tracks']);
          return isEditor;
          
        }
        //this._state.notifyDataChanged('login.successful', {});

      } else {
                                  this._state.notifyDataChanged('spinner.hide', {});

        this.router.navigate(['/login']);
        return res.session;

      }
    }));

  }
}
