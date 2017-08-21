import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';

@Injectable()
export class Publish {

  constructor (public http: Http) {

  }


  publishTracksAndReleases(tracks, releases) {

    let body = JSON.stringify({
      tracks: tracks, 
      releases: releases
    });
    
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/publish', body, options)
    .map((res) => {
      return res.json();
    });

  }

}
