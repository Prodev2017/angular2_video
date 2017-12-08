import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import { GlobalState } from '../../../global.state';

@Injectable()
export class KeyService {
  list: any;
  constructor (public http: Http, public _state:GlobalState) {
      
  }
  getKeys() {
      
    this.http.get('/api/v1/members/keys/list')
     .map((res) => {
       return res.json();
     })
     .subscribe( (res) => {

       for(var i = 0; i < res.Keys.length; i++) {
           res.Keys[i].name = res.Keys[i].camelotKey + ' / ' + res.Keys[i].musicKey;
       }
    
        this.list = res.Keys
        this._state.notifyDataChanged('keys.loaded', this.list);    

     });

      
  }
}