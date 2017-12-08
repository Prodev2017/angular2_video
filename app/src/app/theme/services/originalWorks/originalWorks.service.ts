import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';

@Injectable()
export class OriginalWorks {
  list: any;
  suggestedOriginalWorks: any;
  constructor (public http: Http) {
    this.http.get('/api/v1/members/originalworks/list')
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
    return this.http.get('/api/v1/members/originalworks/list' + urlQueryString)
     .map((res) => {
       return res.json();
     });
  }

  removeOriginalWorkByTrack(trackId) {
    
    console.log(trackId);

      let body = JSON.stringify({trackId: trackId});
      let headers = new Headers({ 'Content-Type': 'application/json' });
      let options = new RequestOptions({ headers: headers });

     return this.http.post('/api/v1/members/originalworks/remove', body, options)
     .map((res) => {
       return res.json();
     });

  }

}
