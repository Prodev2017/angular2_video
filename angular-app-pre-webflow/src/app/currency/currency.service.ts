import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';

@Injectable()
export class Currency {
  settings: any;
  list:any;
  constructor (public http: Http) {

  }

  getCurrencies() {

    return this.http.get(urlPrefix + '/api/v1/members/currency/list')
     .map((res) => {
       return res.json();
     });

  }

  getCurrency (currencyId) {

    return this.http.get(urlPrefix + '/api/v1/members/currency/' + currencyId + '/get')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       res => this.settings = res.Currency
     );

  }
}
