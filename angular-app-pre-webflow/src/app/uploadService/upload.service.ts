import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Rx';
import {urlPrefix} from '../globals/globals.service';
import {Http, Headers, RequestOptions, Response} from '@angular/http';
import {FileUploader} from 'ng2-file-upload/ng2-file-upload';

declare var jQuery:any;

@Injectable()
export class UploadService {
  tracksToModify:Array<any> = [];
  badTracks:Array<any> = [];
  progress:any;
  trackCurrentlyEditing:any;
  tracksRemainingToBeUploaded:boolean = true;
  allOriginalTracks:boolean = false;
  trackEditOriginalWorksIndex:any;
  gigTypeEntry:any;
  editOriginalWorks:boolean = false;
  trackValidationRequirements = {
    name: ['length'],
    version: ['length'],
    artistText: ['length'],
    artistsFeaturedText: [],
    gigTypes: ['length'],
    genres: ['length'],
    cleanDirty: ['length'],
    versionType: ['length'],
    introType: [],
    outroType: [],
    energyRating: ['length'],
    popularityRating: ['length'],
    DJTiming: ['length'],
    releaseYear: ['length'],
    startBpm: ['length','greaterThanZero','threeCharacterMaximum'],
    endBpm: ['length','greaterThanZero','threeCharacterMaximum'],
    originalWorks: ['length'],

  };

  constructor (private http: Http) {

  }

  getDraftTracks() {

    return this.http.get(urlPrefix+'/api/v1/members/track/list/drafts')
    .map(res => res.json() )
    .subscribe((res) => {
      this.tracksToModify = res.Tracks || [];

      for(var i = 0; i < this.tracksToModify.length; i++) {

        for(var property in this.tracksToModify[i]) {
          //console.log(property,newTrack[property]);
          if(this.trackValidationRequirements.hasOwnProperty(property)) {
            //console.log(property,newTrack[property]);
            this.tracksToModify[i].validation = this.updateTrackValidationStatus(this.validateTrackField(property,this.tracksToModify[i][property]),property,this.tracksToModify[i].validation);

          }
        }
      }

      //console.log(this.tracksToModify);

      return this.tracksToModify;

    } );

  }

  updateTracksOriginalStatus() {
    //console.log('all original? ', this.allOriginalTracks);
    this.allOriginalTracks = !this.allOriginalTracks;
    //console.log('all original now? ', this.allOriginalTracks);

    for(var i = 0; i < this.tracksToModify.length; i++) {

      this.tracksToModify[i].isOriginal = this.allOriginalTracks || "";

    }



  }

  addFilesToQueue ($event) {
    $event.preventDefault();

    var filesToReview = $event.dataTransfer.files;

    for (var i = 0; i < filesToReview.length; i++) {
      var position = this.tracksToModify.push(filesToReview[i]);
      //console.log(position);
      this.progress = Observable.create(observer => {
        this.tracksToModify[position-1].progress = observer;
      }).share();

      //console.log(position-1, this.tracksToModify[position-1]);
      var isOKToUpload = this.prepareFileForUpload(filesToReview[i]);
      if (isOKToUpload) {
        //this.makeTrackUploadRequest(urlPrefix + '/api/v1/members/track/uploadPreview', [], 'hiBitRateFile_upload', filesToReview[i]);
      }
    }
  }

  uploadAllTracks() {

    for(var i = 0; i < this.tracksToModify.length; i++) {
    //  this.makeTrackUploadRequest(urlPrefix + '/api/v1/members/track/createPreview', [], 'hiBitRateFile_upload', this.tracksToModify[i], i);
    }

  }

  uploadTrack(track:File, trackIndex) {
  //  this.makeTrackUploadRequest(urlPrefix + '/api/v1/members/track/createPreview', [], 'hiBitRateFile_upload', track, trackIndex);
  }



  submitApprovedTracks() {

    for (var i = 0; i < this.tracksToModify.length; i++) {
      if(this.tracksToModify[i].validation && this.tracksToModify[i].validation.isTrackValid) {
        this.submitValidatedTrack(this.tracksToModify[i]).subscribe((res) => {
          this.tracksToModify.splice(i,1);
        });
      }
    }

  }

  submitValidatedTrack(track) {

    let body = JSON.stringify(track);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(urlPrefix + '/api/v1/members/track/submit',body, options)
    .map(res => res.json())
    .map((res) =>  {
      //console.log(res);
      return res;
    });
  }

  prepareFileForUpload(file:File) {

    var audioType = ["video/mp4","audio/mp3","audio/vnd.wav","audio/mpeg"];

    if(audioType.indexOf(file.type) != -1) {

      return true;

    } else {

      console.log("File " + file.name + " is type " + file.type + " but can only be video/mp4, audio/mpeg, audio/mp3, or audio/vnd.wav");

    }

  }

  removeTrack(trackIndex) {
    var confirmDelete = confirm("Are you sure you want to delete this track?");
    if(confirmDelete) {
      this.http.get(urlPrefix+'/api/v1/members/track/' + this.tracksToModify[trackIndex]._id + '/remove').map(res => res.json()).subscribe(res => {
        if(res.success) {
          this.tracksToModify.splice(trackIndex,1);
        }
      });
    }

  }

  showFiles(event) {

    //console.log(event);

  }

  updateProgress (trackIndex,progress) {
    // this.tracksToModify[trackIndex].progress.next(progress);
    return void 0;

  }

  updateField(fieldName,fieldValue,trackIndex) {

    var isFieldValid = this.validateTrackField(fieldName,fieldValue) || true;
    var safeToPush = false;

    if(isFieldValid) {

      //console.log(fieldName + ' is valid: ' + fieldValue );
      switch(fieldName) {
        case 'releaseYear': {
          console.log('updating releaseYear');
          if(this.tracksToModify[trackIndex][fieldName] < 1900) {
            console.log('updating releaseYear below the min');

            this.tracksToModify[trackIndex][fieldName] = 1900;
            safeToPush = true;
          } else if(this.tracksToModify[trackIndex][fieldName] > new Date().getFullYear()) {
            console.log('updating releaseYear above the min');


            this.tracksToModify[trackIndex][fieldName] = new Date().getFullYear();
            safeToPush = true;
          } else {
            console.log('updating releaseYear at value set');

            this.tracksToModify[trackIndex][fieldName] = fieldValue;
            safeToPush = true;

          }
          break;
        }
        case 'genres': {
          console.log('updating genres');
          this.tracksToModify[trackIndex][fieldName] = this.tracksToModify[trackIndex][fieldName] || [];

          var genreIndex = this.tracksToModify[trackIndex][fieldName].indexOf(fieldValue);
          console.log('this is the genre index',genreIndex);
          if(genreIndex === -1 && this.tracksToModify[trackIndex][fieldName].length < 3) {
            this.tracksToModify[trackIndex][fieldName].push(fieldValue);
            safeToPush = true;
          } else if (genreIndex !== -1) {
            this.tracksToModify[trackIndex][fieldName].splice(genreIndex,1);
            safeToPush = true;
          }
          break;
        }

        case 'gigTypeEntry': {

          safeToPush = true;

          break;
        }

        case 'gigTypeRemove': {
          var gigTypeIndex = this.tracksToModify[trackIndex].gigTypes.indexOf(fieldValue._id);
          this.tracksToModify[trackIndex]['gigTypes'].splice(gigTypeIndex,1);
          safeToPush = true;
          break;
        }

        default: {
          console.log('updating ' + fieldName);

          this.tracksToModify[trackIndex][fieldName] = fieldValue;
          safeToPush = true;
          break;
        }
      }
      if(fieldName !== 'genres' && fieldName !== 'gigTypes') {
        //console.log('this is not an object');

      }


      if(this.tracksToModify[trackIndex].isOriginal) {
        //console.log('yes its an original');
        switch(fieldName) {

          case 'name':
          case 'artistText':
          case 'artistsFeaturedText':
          case 'version': {
            //console.log('yes its one of the fields used in an original work');

            for(var i = 0; i < this.tracksToModify[trackIndex].originalWorks.length; i++) {

              if(this.tracksToModify[trackIndex]['originalWorks'][i].isOriginalWorkEntry) {
                //console.log('yes yes found the original work entry');

                  this.tracksToModify[trackIndex]['originalWorks'][i] = {

                    name: this.tracksToModify[trackIndex].name,
                    artists: this.tracksToModify[trackIndex].artistText,
                    version: this.tracksToModify[trackIndex].version,
                    artistsFeatured: this.tracksToModify[trackIndex].artistsFeaturedText,
                    isOriginalWorkEntry: true

                  };

                  //console.log(this.tracksToModify[trackIndex].originalWorks);

                  break;

              }

            }

            break;
          }

        }

      }


      let body = JSON.stringify(this.tracksToModify[trackIndex]);
      let headers = new Headers({ 'Content-Type': 'application/json' });
      let options = new RequestOptions({ headers: headers });
console.log("is this safe to push?", safeToPush);
      if(safeToPush) {
        return this.http.post(urlPrefix+'/api/v1/members/track/updatePreview',body, options)
        .map(res => res.json())
        .subscribe((res) => {
          this.tracksToModify[trackIndex] = res.Track
          for(var property in this.tracksToModify[trackIndex]) {
            //console.log(property,newTrack[property]);
            if(this.trackValidationRequirements.hasOwnProperty(property)) {
              //console.log(property,newTrack[property]);
              this.tracksToModify[trackIndex].validation = this.updateTrackValidationStatus(this.validateTrackField(property,this.tracksToModify[trackIndex][property]),property,this.tracksToModify[trackIndex].validation)
            }
          }
          //console.log(this.tracksToModify[trackIndex].validation);
          return this.tracksToModify[trackIndex];

        });
      }

    }

  }

  validateTrackField(fieldName, fieldValue) {

    var validationResults = { isValid: true, tests: [] };
    if(this.trackValidationRequirements[fieldName] && this.trackValidationRequirements[fieldName].length > 0) {

      for(var i = 0; i < this.trackValidationRequirements[fieldName].length; i++) {

        switch(this.trackValidationRequirements[fieldName][i]) {

          case 'length': {

            validationResults.tests.push({
              title: "Is Length Greater Than Zero",
              isValid: (fieldValue && fieldValue.length !== 0),
              description: "This field cannot be blank."
            });
            break;
          };
          case 'greaterThanZero': {
            validationResults.tests.push({
              title: "Is Value Greater Than Zero",
              isValid: (fieldValue && fieldValue > 0),
              description: "This field must be greater than zero."
            });
            break;
          };
          case 'threeCharacterMaximum': {
            validationResults.tests.push({
              title: "Is value no more than three digits long?",
              isValid: (fieldValue && fieldValue.toString().length <= 3),
              description: "This field must be no more than three digits."
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
    }

    return validationResults;


  }

  setGigTypeEntry(propertyName, propertyValue, trackIndex) {
      console.log(propertyName,propertyValue,trackIndex);
      if(this.tracksToModify[trackIndex].gigTypeEntry) {
        this.tracksToModify[trackIndex].gigTypeEntry[propertyName] = propertyValue;
        console.log(this.tracksToModify[trackIndex].gigTypeEntry);
      } else {
        this.tracksToModify[trackIndex].gigTypeEntry = {};
        this.tracksToModify[trackIndex].gigTypeEntry[propertyName] = propertyValue;
        console.log(this.tracksToModify[trackIndex].gigTypeEntry);

      }

  }

  updateTrackValidationStatus(validation, fieldName, validationRules) {
    validationRules = validationRules || {};
    validationRules.isTrackValid = validationRules.isTrackValid || true;
    validationRules.fields = validationRules.fields || {};

    if(validation) {
      validationRules.fields[fieldName] = validation;
    }

    for(var property in validationRules.fields) {
      //console.log(property,validationRules.fields[property].isValid);
      validationRules.isTrackValid = validationRules.isTrackValid && validationRules.fields[property].isValid;
    }
    //console.log(validationRules);
    //this.isAtLeastOneTrackValidForUpload();
    //console.log(validationRules);
    return validationRules;
  }

  isAtLeastOneTrackValidForUpload() {
    for(var i = 0; i < this.tracksToModify.length; i++) {
      //  this.
    }
  }

  didAllTracksUpload() {

    var tracksRemainingToBeUploaded = true;
    for(var i = 0; i < this.tracksToModify.length; i++) {
      //console.log("this track is ready? ",this.tracksToModify[i].preprocessedForSubmission);

      if(this.tracksToModify[i].preprocessedForSubmission && typeof(this.tracksToModify[i].preprocessedForSubmission) !== 'undefined') {
        tracksRemainingToBeUploaded = tracksRemainingToBeUploaded && !this.tracksToModify[i].preprocessedForSubmission;
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
