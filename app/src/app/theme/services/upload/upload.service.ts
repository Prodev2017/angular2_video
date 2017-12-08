import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Rx';
import {Http, Headers, RequestOptions, Response} from '@angular/http';
import {FileUploader} from 'ng2-file-upload/ng2-file-upload';
import { GlobalState } from '../../../global.state';
import * as moment from 'moment';
import * as _ from 'lodash';

declare var jQuery:any;

@Injectable()
export class UploadService {
  rejectedTracks:any = {results: []};
  draftMigratedTracks:any = {results: []};
  tracksNeedingEditing:any = {results: []};
  tracksReadyToPublish:any = {results: []};
  tracksNotReadyToPublish:any = {results: []};
  draftTrackList:any = {results: []};
  draftMigrationTrackList:any = {results: []};
  trackList:any = {results: []};
  badTracks:any = {results: []};
  progress:any;
  tracksRemainingToBeUploaded:boolean = true;
  allOriginalTracks:boolean = false;
  trackEditOriginalWorksIndex:any;
  gigTypeEntry:any;
  editOriginalWorks:boolean = false;
  tracksReadyToPublishCount:number = 0;
  selectedCurrencyId:string;
  activeTrackList:string;
  trackValidationRequirements = {
    name: ['length'],
    version: ['length'],
    artistText: ['length'],
    gigTypes: ['length'],
    genres: ['length'],
    cleanDirty: ['length'],
    versionType: ['length'],
    introType: ['length'],
    outroType: ['length'],
    releaseYear: ['length'],
    startBpm: ['length','greaterThanZero','threeCharacterMaximum'],
    endBpm: ['threeCharacterMaximum'],
    originalWorks: ['length'],
    draftFlaggedAsDuplicate: ['isFalse']

  };

  constructor (private http: Http, public _state:GlobalState) {
    

  }

  getDraftTracks(currencyId, page) {

    return this.http.get('/api/v1/members/track/list/drafts?currencyId=' + currencyId + '&page=' + page)
    .map(res => res.json());

  }
  
  getDraftMigrationTracks(currencyId,page) {

    return this.http.get('/api/v1/members/track/list/drafts?migrated=true&currencyId=' + currencyId + '&page=' + page)
    .map(res => res.json());

  }

  updateTracksOriginalStatus(trackList) {
    //console.log('all original? ', this.allOriginalTracks);
    this.allOriginalTracks = !this.allOriginalTracks;
    //console.log('all original now? ', this.allOriginalTracks);

    for(var i = 0; i < this.trackList.results.length; i++) {

      this.trackList.results[i].isOriginal = this.allOriginalTracks || "";

    }



  }

  updateTracksByValidationStatus() {
    
      //console.log('updating lists by validation statuses');

      var tracksReadyToPublish = this.trackList.results.filter( (item) => {
        
        return item.validation && item.validation.isTrackValid && ( item.releases.length == 0 || item.crooklynClanv1AutoMigrated);
        
      });
      
      var tracksNotReadyToPublish = this.trackList.results.filter( (item) => {
        
        return (!item.validation || !item.validation.isTrackValid) && !item.crooklynClanv1AutoMigrated;
        
      });
      
      var draftMigratedTracks = this.trackList.results.filter( (item) => {
        
        return (!item.validation || !item.validation.isTrackValid) && item.crooklynClanv1AutoMigrated;
        
      });

      var tracksReadyToPublishCount = this.tracksReadyToPublish.results.length;
      
      this.tracksReadyToPublish.results = tracksReadyToPublish;
      
      this.tracksNotReadyToPublish.results = tracksNotReadyToPublish;
      
      this.draftMigratedTracks.results = draftMigratedTracks;
      
      this.tracksReadyToPublishCount = tracksReadyToPublishCount;
      
      
  }


  submitApprovedTracks() {
    
    var trackList = 'tracksReadyToPublish';

    for (var i = 0; i < this.trackList.results.length; i++) {
      if(this.trackList.results[i].validation && this.trackList.results[i].validation.isTrackValid) {
        this.submitValidatedTrack(this.trackList.results[i]).subscribe((res) => {
          this.trackList.results.splice(i,1);
        });
      }
    }

  }

  submitValidatedTrack(track) {

    let body = JSON.stringify(track);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/track/submit',body, options)
    .map(res => res.json())
    .map((res) =>  {
      //console.log(res);
      return res;
    });
    
  }

  removeTrack(trackIndex) {
    
    var confirmDelete = confirm("Are you sure you want to delete this track?");
    if(confirmDelete) {
      return this.http.get('/api/v1/members/track/' + this.trackList.results[trackIndex]._id + '/remove').map(res => res.json())
    }

  }

  showFiles(event) {

    //console.log(event);

  }

  updateProgress (trackIndex,progress) {
    // this.trackList.results[trackIndex].progress.next(progress);
    return void 0;

  }

  updateTrackRelease(trackIndex, releaseId) {

    this.trackList.results[trackIndex].releases.push(releaseId);

    let body = JSON.stringify(this.trackList.results[trackIndex]);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/track/updatePreview',body, options)
    .map(res => res.json());

  }

  removeTrackFromRelease(trackIndex) {
    

    this.trackList.results[trackIndex].releases = [];

    let body = JSON.stringify(this.trackList.results[trackIndex]);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/members/track/updatePreview',body, options)
    .map(res => res.json());

  }

  updateField(fieldName,fieldValue,trackIndex, trackList) {
    
    //this._state.notifyDataChanged('track.updatingStarted', {});

    var safeToPush = false;

      //console.log(fieldName + ' is valid: ' + fieldValue );
      switch(fieldName) {
        case 'releaseYear': {
          //console.log('updating releaseYear');
          //console.log(this.trackList.results[trackIndex][fieldName])
          var currentYear = moment().format('YYYY');
          if(fieldValue < 1900 && fieldValue !== false) {

            this.trackList.results[trackIndex][fieldName] = currentYear;

            safeToPush = true;
          } else if(fieldValue > currentYear) {


            this.trackList.results[trackIndex][fieldName] = currentYear;

            safeToPush = true;
          } else {

            this.trackList.results[trackIndex][fieldName] = fieldValue;

            safeToPush = true;

          }
          break;
        }
        case 'genres': {
          //console.log('updating genres');
          this.trackList.results[trackIndex][fieldName] = this.trackList.results[trackIndex][fieldName] || [];

          var genreIndex = this.trackList.results[trackIndex][fieldName].indexOf(fieldValue);
          //console.log('this is the genre index',genreIndex);
          if(genreIndex === -1 && this.trackList.results[trackIndex][fieldName].length < 3) {
            this.trackList.results[trackIndex][fieldName].push(fieldValue);
            safeToPush = true;
          } else if (genreIndex !== -1) {
            this.trackList.results[trackIndex][fieldName].splice(genreIndex,1);
            safeToPush = true;
          }
          break;
        }

        case 'gigTypeEntry': {

          var notADuplicate = true;
          
          for(var i = 0; i < this.trackList.results[trackIndex].gigTypes.length; i++) {
            
            var gigTypeName = this.trackList.results[trackIndex].gigTypes[i].name;
            var gigTypePopularity = this.trackList.results[trackIndex].gigTypes[i].popularity;
            var gigTypeEnergy = this.trackList.results[trackIndex].gigTypes[i].energy;
            var gigTypeDjTiming = this.trackList.results[trackIndex].gigTypes[i].djTiming;

    				notADuplicate = notADuplicate && fieldValue.name != gigTypeName;

          }
          
          if(notADuplicate) {
            
            this.trackList.results[trackIndex].gigTypes.push(_.cloneDeep(fieldValue));

          } else {
            
            var gigTypeIndex = this.trackList.results[trackIndex].gigTypes.map( (gigType) => {
              return gigType.name;
            }).indexOf(fieldValue.name);
            
            if(gigTypeIndex !== -1) {
              this.trackList.results[trackIndex].gigTypes[gigTypeIndex] = fieldValue;
            }
            
          }
          
          this.trackList.results[trackIndex][fieldName] = {}    
          safeToPush = true;

          break;
          
        }

        case 'gigTypeRemove': {
          this.trackList.results[trackIndex]['gigTypes'].splice(fieldValue,1);
          safeToPush = true;
          break;
        }

        default: {
          //console.log('updating ' + fieldName);

          this.trackList.results[trackIndex][fieldName] = fieldValue;
          safeToPush = true;
          break;
        }
      }
      if(fieldName !== 'genres' && fieldName !== 'gigTypes') {
        //console.log('this is not an object');

      }


      if(this.trackList.results[trackIndex].isOriginal) {
        //console.log('yes its an original');
        switch(fieldName) {

          case 'name':
          case 'artistText':
          case 'artistsFeaturedText':
          case 'version': {
            //console.log('yes its one of the fields used in an original work');

            for(var i = 0; i < this.trackList.results[trackIndex].originalWorks.length; i++) {

              if(this.trackList.results[trackIndex]['originalWorks'][i].isOriginalWorkEntry) {
                //console.log('yes yes found the original work entry');

                  this.trackList.results[trackIndex]['originalWorks'][i] = {

                    name: this.trackList.results[trackIndex].name,
                    artists: this.trackList.results[trackIndex].artistText,
                    version: this.trackList.results[trackIndex].version,
                    artistsFeatured: this.trackList.results[trackIndex].artistsFeaturedText,
                    isOriginalWorkEntry: true

                  };

                  //console.log(this.trackList.results[trackIndex].originalWorks);

                  break;

              }

            }

            break;
          }

        }

      }


      if(safeToPush) {
          for(var property in this.trackList.results[trackIndex]) {

            if(this.trackValidationRequirements.hasOwnProperty(property)) {
              
              //console.log('attempting validation', trackIndex, trackList);
              
              this.validateTrackField(property,this.trackList.results[trackIndex][property],trackIndex);
              
            }
          }
          

          this.trackList.results[trackIndex].isChanged = true;
        
     //   });
      }

  }
  
  getTrack(trackId) {
    
    return this.http.get('/api/v1/members/track/' + trackId + '/get')
    .map(res => res.json());

  }
  
  updateTrack(track) {
    
    this._state.notifyDataChanged('track.updatingStarted', {});

    let body = JSON.stringify(track);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    return this.http.post('/api/v1/members/track/updatePreview',body, options)
    .map(res => res.json())

  }

  validateTrackField(fieldName, fieldValue, trackIndex) {
    //console.log(fieldName, fieldValue,trackIndex);
    var validationResults = { isValid: true, tests: [] };
    
    if(this.trackValidationRequirements[fieldName] && this.trackValidationRequirements[fieldName].length > 0) {

      for(var i = 0; i < this.trackValidationRequirements[fieldName].length; i++) {

        switch(this.trackValidationRequirements[fieldName][i]) {

          case 'length': {

            validationResults.tests.push({
              title: "Is Length Greater Than Zero",
              isValid: (typeof fieldValue !== "undefined" && fieldValue && fieldValue.length !== 0),
              description: "This field cannot be blank."
            });
            break;
          };
          case 'greaterThanZero': {
            validationResults.tests.push({
              title: "Is Value Greater Than Zero",
              isValid: (typeof fieldValue !== "undefined" && fieldValue && parseInt(fieldValue) > 0),
              description: "This field must be greater than zero."
            });
            break;
          };
          case 'threeCharacterMaximum': {
            validationResults.tests.push({
              title: "Is value no more than three digits long?",
              isValid: (typeof fieldValue !== "undefined" && fieldValue && fieldValue.toString().length <= 3),
              description: "This field must be no more than three digits."
            });
            break;
          };
          case 'isFalse': {
            
            validationResults.tests.push({
              
              title: "Is the value false?",
              isValid: (fieldValue === false),
              description: "This field must be false."

            });
            break;
          };
          default: {
            break;
          }
        };

      }
      
      for(var i = 0; i < validationResults.tests.length; i++) {

        validationResults.isValid = validationResults.isValid && validationResults.tests[i].isValid;

      }
      
              var validation = this.trackList.results[trackIndex].validation || {};
              this.trackList.results[trackIndex].validation = Object.assign({isTrackValid: false, fields: {}}, validation)
              this.trackList.results[trackIndex].validation.fields[fieldName] = validationResults;

      
    }

  }

  setGigTypeEntry(propertyName, propertyValue, trackIndex, trackList) {
      //console.log(propertyName,propertyValue,trackIndex);
      if(this.trackList.results[trackIndex].gigTypeEntry) {
        this.trackList.results[trackIndex].gigTypeEntry[propertyName] = propertyValue;
      //  console.log(this.trackList.results[trackIndex].gigTypeEntry);
      } else {
        this.trackList.results[trackIndex].gigTypeEntry = {};
        this.trackList.results[trackIndex].gigTypeEntry[propertyName] = propertyValue;
      //  console.log(this.trackList.results[trackIndex].gigTypeEntry);

      }

  }

  updateTrackValidationStatus(trackIndex) {

    var isTrackValid = true;
    
    this.trackList.results[trackIndex].validation = {fields: {}, isTrackValid: true};

    for(var property in this.trackValidationRequirements) {

          this.validateTrackField(property,this.trackList.results[trackIndex][property],trackIndex);

    }
          
      var validationRules = this.trackList.results[trackIndex].validation.fields;
      
      for(var property in validationRules) {
        //console.log(property,validationRules.fields[property].isValid);
        isTrackValid = isTrackValid && validationRules[property].isValid;
      }
      

  
    
    this.trackList.results[trackIndex].validation = Object.assign(this.trackList.results[trackIndex].validation, {isTrackValid: isTrackValid});
  //  console.log('validation of track', trackIndex, this.trackList.results[trackIndex].validation);
  
  }

  isAtLeastOneTrackValidForUpload() {
    var trackList = 'tracksReadyToPublish';
    for(var i = 0; i < this.trackList.results.length; i++) {
      //  this.
    }
  }

  didAllTracksUpload() {
    var trackList = 'tracksReadyToPublish';
    var tracksRemainingToBeUploaded = true;
    for(var i = 0; i < this.trackList.results.length; i++) {
      //console.log("this track is ready? ",this.trackList.results[i].preprocessedForSubmission);

      if(this.trackList.results[i].preprocessedForSubmission && typeof(this.trackList.results[i].preprocessedForSubmission) !== 'undefined') {
        tracksRemainingToBeUploaded = tracksRemainingToBeUploaded && !this.trackList.results[i].preprocessedForSubmission;
      } else {
        tracksRemainingToBeUploaded = true;
      }
    }
    //console.log("are there tracks remaining? ",tracksRemainingToBeUploaded);

    this.tracksRemainingToBeUploaded = tracksRemainingToBeUploaded;

  }

  makeFileRequest(url: string, params: Array<string>, formFieldName: string, file: File) {
    return new Promise((resolve, reject) => {
      var formData: any = new FormData();
      var xhr = new XMLHttpRequest();

      formData.append(formFieldName, file, file.name);

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(xhr.response);
          }
        }
      }
      xhr.open("POST", url, true);
      xhr.send(formData);
    });
  }
}
