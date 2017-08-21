import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import { Currency } from '../../services';

@Injectable()
export class Releases {
  list: any;
  suggestedReleases:any;
  draftList:Array<any> = [];
  constructor (public http: Http) {
    this.http.get('/api/v1/members/releases/list')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       res => this.list = res.Releases
     );

     this.http.get('/api/v1/members/releases/list/draft')
     .map((res) => {
       return res.json();
     })
     .subscribe(
       res => this.draftList = res.Releases
     );
  }

  jsonToQueryString(json) {
    return '?' +
        Object.keys(json).map(function(key) {
            return encodeURIComponent(key) + '=' +
                encodeURIComponent(json[key]);
        }).join('&');
      }

  searchReleases(searchTerms) {

    var urlQueryString = searchTerms;//this.jsonToQueryString(searchTerms);
    console.log(urlQueryString);
    return this.http.get('/api/v1/members/releases/list?name=' + urlQueryString)
     .map((res) => {
       return res.json();
     });

  }

  getTracksByDraftRelease(currencyId) {

     return this.http.get('/api/v1/members/releases/list/draft?currencyId=' + currencyId)
     .map((res) => {
       return res.json();
     });

  }
  
  getRelease(releaseId) {

     return this.http.get('/api/v1/members/releases/' + releaseId + '/get')
     .map((res) => {
       return res.json().Releases;
     });

  }

  publishRelease(release) {

    let body = JSON.stringify(release);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/releases/publish', body, options)
    .map((res) => {
      return res.json();
    });

  }

  updateRelease(release) {

    let body = JSON.stringify(release);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/releases/' + release._id + '/update', body, options)
    .map((res) => {
      return res.json();
    });

  }

  checkAgainstDuplicateReleaseName (releaseName) {

    let body = JSON.stringify({releaseName: releaseName});
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/releases/check', body, options)
    .map((res) => {
      return res.json();
    });


  }

  createRelease (releaseName, mediaType, currencyId) {

    let body = JSON.stringify({name: releaseName, mediaType: mediaType, currency: currencyId});
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/releases/create', body, options)
    .map((res) => {
      return res.json();
    });


  }

  removeRelease (release) {

    return this.http.get('/api/v1/members/releases/' + release._id + '/remove')
    .map( (res) => {
      return res.json();
    });

  }
  
  validateRelease(releaseIndex, currency) {
      
      var releaseToBeValidated = this.draftList[releaseIndex];
      var validation = {isReleaseValid: true, fields: {genres:true, crooklynClanv1SampleTrackUrl: true, description: true, tracks: true}};
      
      //validation.fields.genres = ((currency.slug != 'audio-vault') || releaseToBeValidated.genres && releaseToBeValidated.genres.length > 0);
     // validation.fields.crooklynClanv1SampleTrackUrl = ((currency.slug != 'audio-vault') || (releaseToBeValidated.crooklynClanv1SampleTrackUrl && releaseToBeValidated.crooklynClanv1SampleTrackUrl.length > 0));
      //validation.fields.description = ((currency.slug != 'audio-vault') || releaseToBeValidated.description && releaseToBeValidated.description.length > 0);
      validation.fields.tracks = (releaseToBeValidated.tracks && releaseToBeValidated.tracks.length >= 2);
      validation.isReleaseValid = (/*validation.fields.genres && validation.fields.crooklynClanv1SampleTrackUrl && validation.fields.description &&*/ validation.fields.tracks);

      return validation;
      
    }


}
