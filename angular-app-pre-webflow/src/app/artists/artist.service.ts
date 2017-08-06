import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';

@Injectable()
export class Artists {
  list: any;
  constructor (public http: Http) {
    this.http.get(urlPrefix + '/api/v1/members/artists/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       res => this.list = res.Artists
     );
  }

}
