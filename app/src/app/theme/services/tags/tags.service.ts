import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import { GlobalState } from '../../../global.state';

@Injectable()
export class TagService {
  list: any;
  constructor (public http: Http, public _state:GlobalState) {
    
  }
  
  getTags() {
      this.http.get('/api/v1/members/tags/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       (res) => {
           this.list = res.Tags
          this._state.notifyDataChanged('tags.loaded', this.list);    
       }
     );
  }
}
