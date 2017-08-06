import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';

@Injectable()
export class OriginalWorks {
  list: any;
  suggestedOriginalWorks: any;
  constructor (public http: Http) {
    this.http.get(urlPrefix + '/api/v1/members/originalworks/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       res => this.list = res.OriginalWorks.results
     );
  }

  jsonToQueryString(json) {
    return '?' +
        Object.keys(json).map(function(key) {
            return encodeURIComponent(key) + '=' +
                encodeURIComponent(json[key]);
        }).join('&');
      }

  searchOriginalWorks(searchTerms) {
    var urlQueryString = this.jsonToQueryString(searchTerms);
    console.log(urlQueryString);
    return this.http.get(urlPrefix + '/api/v1/members/originalworks/list' + urlQueryString)
     .map((res) => {
       return res.json();
     });
  }

}
