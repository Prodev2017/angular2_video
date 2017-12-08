import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';

@Injectable()
export class TrackService {
  list: Array<any> = [];
  pages: Array<any> = [];
  currentPage:number;
  totalPages:number;
  totalRecords:number;
  latestPage:number;
  previousFilters:any;
  isUpdating:boolean;
  constructor (public http: Http) {

  }

  updateTrackProperty(property, trackIndex) {

    for(var propName in property) {
      if(property.hasOwnProperty(propName)) {
        var propValue = property[propName];
      }
    }

    if(propValue.length != 0) {

      let body = JSON.stringify(property);
      let headers = new Headers({ 'Content-Type': 'application/json' });
      let options = new RequestOptions({ headers: headers });
      //console.log(property,trackId);
      return this.http.post('/api/v1/members/track/'+this.list[trackIndex]._id+'/update', body, options)
      .map((res) => res.json())
      .map((res) => {
        return res;
      })
      .subscribe(res => this.list[trackIndex] = res.Track);
    }
    
  }

  downloadHiBitRateTrack(trackId) {
    return this.http.get('/api/v1/members/track/' + trackId + '/download/hi/').map(res => res.json());
  }

   getLibrary (currencyId, filters, pageNumber) {

  
    currencyId = currencyId;
    filters = filters || {};
    pageNumber = pageNumber || 1;

    this.isUpdating = true;

    var queryString = [];
    
        if(filters.textSearchField && filters.textSearchField.length > 0) {
      
      queryString.push('q=' + encodeURIComponent(filters.textSearchField));
      
    }


    //Genre Filter Query Parameters
    if(filters.genres && filters.genres.length > 0) {
      for(var i =0; i < filters.genres.length; i++) {
        queryString.push('genres[]='+filters.genres[i]);
      }
    }

    //Collection Filter Query Parameters
    if(filters.collections && filters.collections.length > 0) {
      for(var i =0; i < filters.collections.length; i++) {
        queryString.push('collections[]='+filters.collections[i]);
      }
    }

    //Keys Filter Query Parameters
    if(filters.keys && filters.keys.length > 0) {
      for(var i =0; i < filters.keys.length; i++) {
        queryString.push('keys[]='+filters.keys[i]);
      }
    }

    //Editors Filter Query Parameters
    if(filters.editors && filters.editors.length > 0) {
      for(var i =0; i < filters.editors.length; i++) {
        queryString.push('editors[]='+filters.editors[i]);
      }
    }

    //Tags Filter Query Parameters
    if(filters.tags && filters.tags.length > 0) {
      for(var i =0; i < filters.tags.length; i++) {
        queryString.push('tags[]='+filters.tags[i]);
      }
    }
    
    //Artist Filter Query Parameters
    if(filters.artistName) {
      queryString.push('artistName='+filters.artistName);
    }
    
        if(filters.trackName) {
      queryString.push('trackName='+filters.trackName);
    }

    if(filters.minYear) {
      queryString.push('minYear='+filters.minYear);
    }

    if(filters.maxYear) {
      queryString.push('maxYear='+filters.maxYear);
    }

    if(filters.startBpm) {
      queryString.push('startBpm='+filters.startBpm);
    }

    if(filters.endBpm) {
      queryString.push('endBpm='+filters.endBpm);
    }

    if(filters.sortField) {
      queryString.push('sortField='+filters.sortField);
    }
    
    if(filters.sortOrder) {
      queryString.push('sortOrder='+filters.sortOrder);
    }

    if(filters.rows) {
      queryString.push('rows='+filters.rows);
    }


    if(filters.autocompleteQuery) {
      queryString.push('autocompleteQuery='+encodeURIComponent(filters.autocompleteQuery));
    }

    if(filters.release) {
      queryString.push('release='+filters.release);
    }

    var url = "?" + queryString.join("&");
    return this.http.get('/api/v1/members/account/library/currency/' + currencyId + '/list/' + pageNumber + url)
    .map((res) => {
      return res.json();
    });


  }

  getTracks (currencyId, filters, pageNumber) {

    currencyId = currencyId;
    filters = filters || {};
    pageNumber = pageNumber || 1;

    this.isUpdating = true;

    var queryString = [];
    
    if(filters.textSearchField && filters.textSearchField.length > 0) {
      
      queryString.push('q=' + encodeURIComponent(filters.textSearchField));
      
    }

    //Genre Filter Query Parameters
    if(filters.genres && filters.genres.length > 0) {
      for(var i =0; i < filters.genres.length; i++) {
        queryString.push('genres[]='+filters.genres[i]);
      }
    }

    //Collection Filter Query Parameters
    if(filters.collections && filters.collections.length > 0) {
      for(var i =0; i < filters.collections.length; i++) {
        queryString.push('collections[]='+filters.collections[i]);
      }
    }

    //Keys Filter Query Parameters
    if(filters.keys && filters.keys.length > 0) {
      for(var i =0; i < filters.keys.length; i++) {
        queryString.push('keys[]='+filters.keys[i]);
      }
    }

    //Editors Filter Query Parameters
    if(filters.editors && filters.editors.length > 0) {
      for(var i =0; i < filters.editors.length; i++) {
        queryString.push('editors[]='+filters.editors[i]);
      }
    }

    //Tags Filter Query Parameters
    if(filters.tags && filters.tags.length > 0) {
      for(var i =0; i < filters.tags.length; i++) {
        queryString.push('tags[]='+filters.tags[i]);
      }
    }
    
    //Artist Filter Query Parameters
    if(filters.artistName) {
      queryString.push('artistName='+filters.artistName);
    }
    
        if(filters.trackName) {
      queryString.push('trackName='+filters.trackName);
    }

    if(filters.minYear) {
      queryString.push('minYear='+filters.minYear);
    }

    if(filters.maxYear) {
      queryString.push('maxYear='+filters.maxYear);
    }

    if(filters.startBpm) {
      queryString.push('startBpm='+filters.startBpm);
    }

    if(filters.endBpm) {
      queryString.push('endBpm='+filters.endBpm);
    }

    if(filters.sortField) {
      queryString.push('sortField='+filters.sortField);
    }
    
    if(filters.sortOrder) {
      queryString.push('sortOrder='+filters.sortOrder);
    }

    if(filters.rows) {
      queryString.push('rows='+filters.rows);
    }


    if(filters.autocompleteQuery) {
      queryString.push('autocompleteQuery='+encodeURIComponent(filters.autocompleteQuery));
    }

    if(filters.release) {
      queryString.push('release='+filters.release);
    }

    var url = "?" + queryString.join("&");
    return this.http.get('/api/v1/members/currency/' + currencyId + '/tracks/list/' + pageNumber + url)
    .map((res) => {
      return res.json();
    });
  }
}
