import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import {GlobalState} from '../../../global.state';
import { AppState } from '../../../app.service';
import { AuthService } from '../auth';

@Injectable()
export class Currency {
  list:Array<any> = [];
  selectedCurrency:any = {};
  currenciesWithEnabledStatuses:Array<any> = [];

  constructor (public http: Http, public _state:GlobalState, public appState:AppState, public authService:AuthService ) {

  }

  ngOnInit() {
    
  }

  onLogin() {

  }

  getCurrencies() {

    return this.http.get('/api/v1/members/currency/list')
     .map((res) => {
       return res.json();
     });

  }
  
  getAccountingPeriods(currencyId) {
    
        return this.http.get('/api/v1/members/currency/' + currencyId + '/accountingPeriods/list')
     .map((res) => {
       return res.json();
     });
    
    
  }
  
    getCharts(currencyId) {
    
        return this.http.get('/api/v1/members/currency/' + currencyId + '/charts/list')
     .map((res) => {
       return res.json();
     });
    
    
  }
  
  getMyEditorCollections(currencyId, editorId) {
    
    return this.http.get('/api/v1/members/currency/' + currencyId + '/collections/' + editorId + '/list')
     .map((res) => {
       return res.json();
     });
    
  }
  
    getCollection(currencyId, collectionId, rowsPerPage?, currentPage?) {
    
      if(collectionId == 'top-all-time') {
       
        return this.http.get('/api/v1/members/currency/' + currencyId + '/top/list/' + currentPage + '?rowsPerPage=' + rowsPerPage).map(res => res.json());
    
      } else if(collectionId == 'top-current-month') {
       
        return this.http.get('/api/v1/members/currency/' + currencyId + '/top/this-month/list/' + currentPage + '?rowsPerPage=' + rowsPerPage).map(res => res.json());
    
      } else if(collectionId == 'top-last-month') {
       
        return this.http.get('/api/v1/members/currency/' + currencyId + '/top/last-month/list/' + currentPage + '?rowsPerPage=' + rowsPerPage).map(res => res.json());
    
      } else {
        
        return this.http.get('/api/v1/members/currency/' + currencyId + '/collections/' + collectionId + '/get')
         .map((res) => {
           return res.json();
      });

        
      }
   
    
  }
  
  createCollection(currencyId, collectionData) {
    
    let body = JSON.stringify(collectionData);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    
    return this.http.post('/api/v1/members/currency/' + currencyId + '/collections/create', body, options)
    .map((res) => {
      return res.json();
    });
    
  }
  
    updateCollection(currencyId, collectionData) {
    
    let body = JSON.stringify(collectionData);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    
    return this.http.post('/api/v1/members/currency/' + currencyId + '/collections/' + collectionData._id + '/update', body, options)
    .map((res) => {
      return res.json();
    });
    
  }


  getPackages() {

     return this.http.get('/api/v1/members/currency/packages/list')
     .map((res) => {
       return res.json();
     });

  }

  getCurrencyLinks(forEditorUploader?:boolean) {
    
    console.log('for editor uploader value', forEditorUploader);
    
    this.currenciesWithEnabledStatuses = [];

      for(var i = 0; i < this.list.length; i++) {

        this.currenciesWithEnabledStatuses.push(Object.assign({},this.list[i]));
      
        if(forEditorUploader === true) {
  
          this.currenciesWithEnabledStatuses[i].enabled = this.list[i].enabled && this.authService.authResponse.profileData.currencies.indexOf(this.list[i]._id) !== -1;
          
        } else {
          
          this.currenciesWithEnabledStatuses[i].enabled = this.list[i].enabled;
          
        }

      }
      
      var enabledCurrencies = this.currenciesWithEnabledStatuses.filter( (item) => {
        
        return item.enabled;
        
      });
      
      if(this.selectedCurrency) {
        

      var selectedCurrencyIndex = enabledCurrencies.findIndex( (item) => {
        
        return item._id == this.selectedCurrency._id;
        
      });
      
      if(selectedCurrencyIndex === -1) {
        
        this.selectedCurrency = enabledCurrencies[0];
        
      }
      
      } else {
        
                this.selectedCurrency = enabledCurrencies[0];

        
      }
      
      console.log('updated currency links', this.currenciesWithEnabledStatuses);

      return this.currenciesWithEnabledStatuses;

  }

  getCurrency (currencyId) {

    return this.http.get('/api/v1/members/currency/' + currencyId + '/get')
     .map((res) => {
       return res.json();
     });
  }
  
  getAvailableAccountingPeriods (currencyId) {
    
    return this.http.get('/api/v1/members/currency/' + currencyId + '/accountingPeriods/list')
    .map((res) => {
      return res.json();
    });
    
  }
  
  getCrates(currencyId) {
    
    return this.http.get('/api/v1/members/currency/' + currencyId + '/crates/list')
    .map((res) => {
      return res.json();
    });
    
  }
  
  getCrate(currencyId, crateId) {
    
    return this.http.get('/api/v1/members/currency/' + currencyId + '/crates/' + crateId + '/get')
    .map((res) => {
      return res.json();
    });
    
  }
  
  saveCrate(currencyId, crate) {
    
    let body = JSON.stringify(crate);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    
    return this.http.post('/api/v1/members/currency/' + currencyId + '/crates/' + crate._id + '/update', body, options)
    .map((res) => {
      return res.json();
    });
    
  }
  
   removeCrate(currencyId, crateId) {
    
    return this.http.get('/api/v1/members/currency/' + currencyId + '/crates/' + crateId + '/remove')
    .map((res) => {
      return res.json();
    });
    
  }
  
     removeCollection(collectionId,currencyId) {
       
    return this.http.get('/api/v1/members/currency/' + currencyId + '/collections/' + collectionId + '/remove')
    .map((res) => {
      return res.json();
    });
    
  }
  
       removeCollectionFromMyCrates(collectionId) {
       
    let body = JSON.stringify({_id: collectionId});
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    
    return this.http.post('/api/v1/members/account/collections/remove', body, options)
    .map((res) => {
      return res.json();
    });
    
  }
  
  
  
    createCrate(currencyId, crate) {
      
      let body = JSON.stringify(crate);
      let headers = new Headers({ 'Content-Type': 'application/json' });
      let options = new RequestOptions({ headers: headers });

    
    return this.http.post('/api/v1/members/currency/' + currencyId + '/crates/create', body, options)
    .map((res) => {
      return res.json();
    });
    
  }
  
  getCollections(currencyId) {
    
       return this.http.get('/api/v1/members/currency/' + currencyId + '/collections/list')
    .map((res) => {
      return res.json();
    });
    
  }
  
    addCollectionToMyCrates(collectionId) {
    
    let body = JSON.stringify({_id: collectionId});
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    
    return this.http.post('/api/v1/members/account/collections/add', body, options)
    .map((res) => {
      return res.json();
    });
    
  }
  

}
