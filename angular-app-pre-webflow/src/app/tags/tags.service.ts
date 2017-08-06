import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';

@Injectable()
export class Tags {
  list: any;
  constructor (public http: Http) {
    this.http.get(urlPrefix + '/api/v1/members/tags/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       res => this.list = res.Tags
     );
  }
}
