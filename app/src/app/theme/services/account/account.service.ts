import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import {GlobalState} from '../../../global.state';
import {AppState} from '../../../app.service';

@Injectable()
export class Account {

  profile:any = {
    photo: {url: null },
    logoSquare: {url: null },
    logoLong: {url: null },
    backgroundImage: { url: null },
    name: { first: null, last: null }
  };

  constructor (public http: Http, public _state:GlobalState, public appState:AppState) {

  }

  getAccountData() {
    
     return this.http.get('/api/v1/members/account/get').map( (res) => res.json() );

  }
  
  getTransactionHistory() { 
    
         return this.http.get('/api/v1/members/account/transactions/list').map( (res) => res.json() );

  }


  getCreditBalance (currencyId) {

    return this.http.get('/api/v1/members/account/getCreditBalance/currency/' + currencyId)
     .map((res) => {
       return res.json();
     });

  }
  
  getDownloadQueueForCurrency(currencyId, filters) {
    
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
    return this.http.get('/api/v1/members/account/downloadQueue/currency/' + currencyId + url)
     .map((res) => {
       return res.json();
     });

    


  }
  
  addTrackToDownloadQueueForCurrency(track, currencyId) {
    
    let body = JSON.stringify({track: track._id});
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/account/downloadQueue/currency/' + currencyId + '/add',body, options)
    .map((res) => {
       return res.json();
    });
    
  }
  
  removeTrackFromDownloadQueueForCurrency(track, currencyId) {
    
    let body = JSON.stringify({track: track._id});
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/account/downloadQueue/currency/' + currencyId + '/remove',body, options)
    .map((res) => {
       return res.json();
    });
    
  }


  updateProfile (userData) {

    let body = JSON.stringify(userData);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/account/update', body, options)
              .map(res => res.json())
              .map(res => this.profile = res.User);

  }
  
  getMyUploadedTracks (currencyId, filters, pageNumber) {

    currencyId = currencyId;
    filters = filters || {};
    pageNumber = pageNumber || 1;

    var queryString = [];

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
    
        if(filters.accountingPeriod) {
      queryString.push('accountingPeriod='+filters.accountingPeriod);
    }

    if(filters.release) {
      queryString.push('release='+filters.release);
    }

    var url = "?" + queryString.join("&");
    return this.http.get('/api/v1/members/account/tracks/' + currencyId + '/list/' + pageNumber + url)
    .map((res) => {
      return res.json();
    });
  }



}
