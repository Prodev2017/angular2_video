import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';

@Injectable()
export class EditorService {
  list: any;
  constructor (public http: Http) {

  }

  getCurrencyEditors (currencyId) {

    return this.http.get('/api/v1/members/currency/' + currencyId + '/editors/list')
     .map((res) => {
       return res.json();
     });

  }

  getCurrencyEditorLinks() {

      var currencyLinks = [];

      for(var i = 0; i < this.list.length; i++) {
        console.log(this.list[i].name);
        var editorLink = {
            path: this.list[i]._id,
            data: {
              menu: {
                title: this.list[i].name
              }
            }
        };
        
        currencyLinks.push(editorLink);

      }
      return currencyLinks;

  }

}
