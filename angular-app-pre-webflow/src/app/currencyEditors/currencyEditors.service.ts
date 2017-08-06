import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';

@Injectable()
export class CurrencyEditors {
  list: any;
  constructor (public http: Http) {

  }

  getCurrencyEditors (currencyId) {
    return this.http.get(urlPrefix + '/api/v1/members/currency/' + currencyId + '/editors/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       res => this.list = res.CurrencyEditors
     );
  }
}
