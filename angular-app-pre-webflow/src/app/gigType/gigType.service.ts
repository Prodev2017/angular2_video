import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';

@Injectable()
export class GigTypes {
  list: any;
  distinctList: any;
  constructor (public http: Http) {
    this.http.get(urlPrefix + '/api/v1/members/gigtypes/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       (res) => {
         this.list = res.GigTypes;
         this.distinctList = res.DistinctGigTypes;
         return this.list;/*.map((item) => {
           return { id: item._id, text: item.name };
         });*/
       }
     );
  }
}
