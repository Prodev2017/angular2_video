import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';

@Injectable()
export class Genres {
  list: any;
  constructor (public http: Http) {
    this.http.get(urlPrefix + '/api/v1/members/genres/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       (res) => {
         return this.list = res.Genres.map((item) => {
           return { id: item._id, name: item.name };
         });

       }
     );
  }

}
