import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import { GlobalState } from '../../../global.state';

@Injectable()
export class Genres {
  list: any;
  constructor (public http: Http, public _state:GlobalState) {
      
  }
  
  getGenres() {
          this.http.get('/api/v1/members/genres/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       (res) => {
         this.list = res.Genres.map((item) => {
           return { id: item._id, name: item.name };
         });

            this._state.notifyDataChanged('genres.loaded', this.list);    

       }
     );
  }

}
