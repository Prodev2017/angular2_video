import { Injectable }             from '@angular/core';
import { Router, Resolve,
         ActivatedRouteSnapshot } from '@angular/router';
import { Observable }             from 'rxjs/Observable';
import { AuthService } from './';

@Injectable()
export class AuthResolve implements Resolve<any> {
  constructor(private authService: AuthService, private router: Router) {}
  resolve(route: ActivatedRouteSnapshot): Observable<any> | Promise<any> | any {
    return this.authService.checkLoginStatus().toPromise().then(res => {
      this.authService.isLoggedIn = res.session;
      if (res.session) {

        return res.session;
      } else { // id not found
        this.router.navigate(['/login']);
        return res.session;
      }
    });
  }
}
