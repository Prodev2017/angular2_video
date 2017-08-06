import {Injectable } from '@angular/core';
import {Http, Response, Headers, RequestOptions} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';
import {AppState} from '../app.service';

@Injectable()
export class Account {
  response: any;
  loggedIn: boolean;
  auth_token: string;
  profileData: any;

  constructor (public http: Http) {
    this.auth_token = localStorage.getItem('auth_token');
    this.loggedIn = (this.auth_token && this.auth_token.length > 0);
    this.checkAuth();
  }

  checkAuth() {

    return this.http.get(urlPrefix + '/api/v1/members/account/check')
          .map(res => res.json());

  }

  isLoggedIn() {

    return this.http.get(urlPrefix + '/api/v1/members/account/check')
          .map(res => res.json())
          .map(res => this.loggedIn = res.session)
          .subscribe(res => this.loggedIn = res);

  }

  getUserData() {

    return this.http.get(urlPrefix + '/api/v1/members/account/get')
              .map(res => res.json())
              .map(res => this.profileData = res.User);

  }

  updateUserData(accountData, logoFile, photoFile) {
    var totalPayload = Object.assign({}, accountData, {logo_upload: logoFile} , {photo_upload: photoFile});
    console.log(totalPayload);
    let body = JSON.stringify(totalPayload);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(urlPrefix + '/api/v1/members/account/update',body, options)
              .map(res => res.json())
              .map(res => this.profileData = res.User);

  }

  login(accountData) {

    let body = JSON.stringify(accountData);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    return this.http.post(urlPrefix + '/api/v1/members/account/login', body, options)
            .map(res => res.json())
            .map((res) => {

               return res;
             });

  }

  logout() {

    return this.http.get(urlPrefix + '/api/v1/members/account/logout')
          .map(res => res.json());

  }

  create(accountData) {
    let body = JSON.stringify(accountData);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    return this.http.post(urlPrefix + '/api/v1/members/account/create', body, options)
      .map((res) => {
        return res.json();
      })
      .subscribe(res => this.response = res);
    }

}
