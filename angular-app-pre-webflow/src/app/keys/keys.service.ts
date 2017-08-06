import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {urlPrefix} from '../globals/globals.service';

@Injectable()
export class Keys {
  list: any;
  constructor (public http: Http) {
    this.http.get(urlPrefix + '/api/v1/members/keys/list')
     .map((res) => {
       return res.json();
     })
     .subscribe((res) => {

       for(var i = 0; i < res.Keys.length; i++) {
           res.Keys[i].name = res.Keys[i].musicKey + ' / ' + res.Keys[i].camelotKey;
       }

       return this.list = res.Keys;

     });
  }
}
