import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';

@Injectable()
export class AuthService {
  isLoggedIn:boolean = false;
  authResponse:any;
  // store the URL so we can redirect after logging in
  redirectUrl: string = "/";

  constructor(public http:Http ) {

  }

  checkLoginStatus() {
    return this.http.get('/api/v1/members/account/check')
          .map(res => res.json());
  }

  login(accountData) {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    return this.http.post('/api/v1/members/account/login', accountData, options)
            .map(res => res.json());
  }

  logout() {

    return this.http.get('/api/v1/members/account/logout')
          .map(res => res.json());

  }
}
