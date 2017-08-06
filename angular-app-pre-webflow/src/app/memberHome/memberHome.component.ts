import {Component, Injectable} from '@angular/core';
import {AppState} from '../app.service';
import {Tracks} from '../tracks/tracks.service';
import {Http, Headers} from '@angular/http';
import {string2Date} from '../datePipe/date.pipe';
import {FilterAlreadySelectedGenres,FilterTagOptionsForSetting} from '../listFilter/listFilter.pipe';
import {seconds2time} from '../seconds2TimePipe/seconds2TimePipe.pipe';
import {Rule} from '../ruleClass/rule.class';
import {Genres} from '../genres/genres.service';
import {Artists} from '../artists/artist.service';
import {Keys} from '../keys/keys.service';
import {Tags} from '../tags/tags.service';
import {Currency} from '../currency/currency.service';
import {GigTypes} from '../gigType/gigType.service';
import {OriginalWorks} from '../originalWorks/originalWorks.service';
import {CurrencyEditors} from '../currencyEditors/currencyEditors.service';
import {CurrencyCollections} from '../currencyCollections/currencyCollections.service';
import {CurrencyCrates} from '../currencyCrates/currencyCrates.service';
import {CurrencyCharts} from '../currencyCharts/currencyCharts.service';
import {CanActivate } from '@angular/router';
import { Account } from '../account';
import { User } from '../account/user.model';
import { UploadService } from '../uploadService/upload.service';
import {urlPrefix} from '../globals/globals.service';
import { NgForm } from '@angular/common';
import {FILE_UPLOAD_DIRECTIVES, FileUploader} from 'ng2-file-upload/ng2-file-upload';
import {SELECT_DIRECTIVES} from 'ng2-select/ng2-select';
import { WaveSurferService } from '../wavesurfer';
import { ACCORDION_DIRECTIVES } from 'ng2-bootstrap/components/accordion';
import { DATEPICKER_DIRECTIVES } from 'ng2-bootstrap/components/datepicker';
var mp3Parser = require('mp3-parser');

declare var jcf: any;
declare var ID3:any;

@Component({
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'memberHome',  // <home></home>
  // We need to tell Angular's Dependency Injection which providers are in our app.
  providers: [ Artists, Currency, Genres, Keys, CurrencyEditors,CurrencyCollections,CurrencyCrates, CurrencyCharts, Tracks, Tags, UploadService, GigTypes, OriginalWorks
  ],
  // We need to tell Angular's compiler which directives are in our template.
  // Doing so will allow Angular to attach our behavior to an element
  directives: [FILE_UPLOAD_DIRECTIVES, SELECT_DIRECTIVES, ACCORDION_DIRECTIVES, DATEPICKER_DIRECTIVES
  ],
  // We need to tell Angular's compiler which custom pipes are in our template.
  pipes: [ string2Date, seconds2time, FilterAlreadySelectedGenres, FilterTagOptionsForSetting ],
  // Our list of styles in our component. We may add more to compose many styles together
  styleUrls: [ './memberHome.css' ],
  // Every Angular template is first compiled by the browser before Angular runs it's compiler
  templateUrl: './memberHome.html'
})

export class MemberHome {
  filters:Array<any> = [];
  selectedCurrency:string;
  selectedMainGenres:Array<String> = [];
  selectedCollections:Array<String>  = [];
  startBpm:number;
  endBpm:number;
  minYear:number;
  maxYear:number;
  criteria:Object;
  selectedKeys:Array<String>  = [];
  selectedTags:Array<String>  = [];
  selectedEditors:Array<String>  = [];
  selectedGenre:any;
  temporaryFilter:string = '';
  release:string =  '';
  rules:Array<Rule> = [];
  availableCriteria:Array<Object> = [];
  availableCriteriaSettings:any;
  operatorSettingsPerType:any;
  operators:any;
  sortBy:string;
  sortByColumn:string;
  sortDirection:string;
  autocompleteQuery:string;
  showEditorPanel:boolean = false;
  showProfilePanel:boolean = false;
  showTrackUploadPanel:boolean = false;
  logoFileToUpload: File;
  photoFileToUpload: File;
  user:User;
  activeEditor:any;
  areFilesDraggedOver:boolean;
  wavesurfer:any;
  trackUploadProgress:any;
  tracksRemainingToBeUploaded:boolean;
  trackEditOriginalWorksIndex:any;
  editOriginalWorks:boolean = false;
  editGigTypes:boolean = false;
  trackEditGigTypesIndex:any;
  suggestedOriginalWorks:any;
  originalWorksSearchTerm:string;
  hasBaseDropZoneOver:boolean = false;
  hasAnotherDropZoneOver:boolean = false;
  currentYear:number;
  showSuggestedOriginalWorks:boolean;
  draftOriginalWork:any = {name: '', version: '', artists: '', artistsFeatured: ''};
  public uploader:FileUploader = new FileUploader({
    url: urlPrefix + '/api/v1/members/track/createPreview'
  });
  showUploadQueueTable:boolean = false;


  // TypeScript public modifiers
  constructor(public appState: AppState,
    public account: Account,
    public currency: Currency,
    public tracks: Tracks,
    public genres: Genres,
    public keys: Keys,
    public currencyEditors: CurrencyEditors,
    public currencyCollections: CurrencyCollections,
    public currencyCrates: CurrencyCrates,
    public currencyCharts: CurrencyCharts,
    public tags: Tags,
    public http: Http,
    public uploadService: UploadService,
    public gigTypes: GigTypes,
    public originalWorks: OriginalWorks,
    public artists: Artists,
    public waveSurferService: WaveSurferService)
    {

      this.currentYear = new Date().getFullYear();

      this.uploader.onAfterAddingFile = (item) => {
        console.log(item);
               var reader = new FileReader();
               reader.onload = () => {
                 var fileIndex = this.uploader.getIndexOfItem(item);
                 if(item._file.trackIdToReplace) {
                   this.uploader.queue[fileIndex].alias = 'replace_track_for_' + item._file.trackIdToReplace || 'file';
                 }

                   var tags = mp3Parser.readTags(new DataView(reader.result));
                   console.log(tags[1].header.bitrate,tags);

                   if(tags[1].header.bitrate < 320) {
                     this.uploader.queue[fileIndex].isError = true;
                     this.uploader.queue[fileIndex].isReady = false;
                     this.uploader.queue[fileIndex].isUploaded = true;
                     this.uploader.queue[fileIndex].errorMessage = "Bit rate is below 320kbps";
                   }
               };

               reader.readAsArrayBuffer(item.some);
      }

      this.uploader.onProgressAll = (progress:any) => {

        var totalBytesToUpload:number = 0;
        var currentBytesUploaded:number = 0;

        for(var i = 0; i < this.uploader.queue.length; i++) {

          console.log(this.uploader.queue[i]);

          if(this.uploader.queue[i].isError) {

            console.log('Should be ignoring', this.uploader.queue[i]);

          } else {

            totalBytesToUpload += this.uploader.queue[i].some.size;
            currentBytesUploaded += (this.uploader.queue[i].some.size * this.uploader.queue[i].progress);

          }

        }

        var newProgress = Math.round(currentBytesUploaded) / Math.round(totalBytesToUpload);
        this.uploader.progress = 100;
        console.log(this.uploader.progress);
        return 100;

      }

      this.uploader.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
        if(this.uploader.getNotUploadedItems().length == 0) {
          //  this.showUploadQueueTable = false;
        }

        var responseObject = JSON.parse(response);
        if(responseObject.error) {

          this.uploadService.badTracks.push(responseObject);
        } else {

        var newTrack = responseObject.Track;

        for(var property in newTrack) {
          //console.log(property,newTrack[property]);
          if(this.uploadService.trackValidationRequirements.hasOwnProperty(property)) {
            console.log(property,newTrack[property]);
            newTrack.validation = this.uploadService.updateTrackValidationStatus(this.uploadService.validateTrackField(property,newTrack[property]),property,newTrack.validation)
          }
        }
        this.uploadService.tracksToModify.push(newTrack);
      }
      };

      this.uploader.uploadAll = () => {

        let items = this.uploader.getNotUploadedItems().filter((item) => !item.isUploading);

        if (!items.length) {
          return;
        }

        items.map((item) => item._prepareToUploading());

        for(var i = 0; i < items.length; i++) {

          items[i].upload();
          this.uploader.isUploading = false;

        }

      }

      var operatorSettingsPerType = this.operators = {
        list: [
          { label: 'is', operator: '==' },
          { label: 'is not', operator: '==' },
          { label: 'contains', operator: '~' },
          { label: 'does not contain', operator: '!~' },

        ],
        text: [
          { label: 'is', operator: '==' },
          { label: 'is not', operator: '==' },
          { label: 'contains', operator: '~' },
          { label: 'does not contain', operator: '!~' },

        ],
        number: [
          { label: 'is greater than or equal to', operator: '>=' },
          { label: 'is less than or equal to', operator: '<=' },
        ]
      };

      var availableCriteriaSettings = this.availableCriteriaSettings = {
        genres: {
          label: 'Genre',
          key: 'genres',
          type: 'list'
        },
        keys: {
          label: 'Keys',
          key: 'keys',
          type: 'list'
        },
        tags: {
          label: 'Tags',
          key: 'tags',
          type: 'list'
        },
        year: {
          label: 'Year',
          key: 'year',
          type: 'number'
        },
        bpm: {
          label: 'BPM',
          key: 'bpm',
          type: 'number'
        },
        currencyCollections: {
          label: 'Collection',
          key: 'currencyCollections',
          type: 'list'
        },
        dateAdded: {
          label: 'Date Added',
          key: 'dateAdded',
          type: 'date'
        },
        artist: {
          label: 'Artist',
          key: 'artist',
          type: 'list'
        },
        album: {
          label: 'Album',
          key: 'album',
          type: 'list'
        },
        comment: {
          label: 'Comment',
          key: 'comment',
          type: 'text'
        },
        editor: {
          label: 'Editor',
          key: 'currencyEditors',
          type: 'list'
        },
        song: {
          label: "Song",
          key: 'track',
          type: 'text'
        }


      };

      this.availableCriteria = Object.keys(availableCriteriaSettings).map(function(k) { return availableCriteriaSettings[k] });
      this.rules.push({options:null ,type:'',selectedOperator:'',availableOperators:{},value:'',key:''});
      this.currency.getCurrencies().subscribe(
        (res) => {
          this.currency.list = res.Currencies;
          this.selectedCurrency = res.Currencies[0]._id;
          this.currency.getCurrency(this.selectedCurrency);
          this.currencyEditors.getCurrencyEditors(this.selectedCurrency);
          this.currencyCollections.getCurrencyCollections(this.selectedCurrency);
          this.currencyCrates.getCurrencyCrates(this.selectedCurrency);
          this.currencyCharts.getCurrencyCharts(this.selectedCurrency);
          this.tracks.getTracks(this.selectedCurrency, false, 1);

        }
      );


    }

    public fileOverBase(e:any):void {
      this.hasBaseDropZoneOver = e;
    }

    public fileOverAnother(e:any):void {
      this.hasAnotherDropZoneOver = e;
    }

    public selected(value:any,trackIndex,fieldName):void {
      if(this.uploadService.tracksToModify[trackIndex][fieldName]) {
        this.uploadService.tracksToModify[trackIndex][fieldName].push(value);
      } else {
        this.uploadService.tracksToModify[trackIndex][fieldName] = [];
        this.uploadService.tracksToModify[trackIndex][fieldName].push(value);
      }
      this.uploadService.updateField(fieldName,value,trackIndex);

    }

    public seeValue(value:any) {
      console.log('this is the latest value: ', value);
    }

    public setMultipleValueField(value:any,trackIndex,fieldName):void {

      /*if(value && value.length != 0) {
      this.uploadService.tracksToModify[trackIndex][fieldName] = value;
      this.uploadService.tracksToModify[trackIndex].validation = this.uploadService.updateTrackValidationStatus(this.uploadService.validateTrackField(fieldName,this.uploadService.tracksToModify[trackIndex][fieldName]),fieldName,this.uploadService.tracksToModify[trackIndex].validation)
    } else {
    this.uploadService.tracksToModify[trackIndex][fieldName] = [];
    this.uploadService.tracksToModify[trackIndex].validation = this.uploadService.updateTrackValidationStatus(this.uploadService.validateTrackField(fieldName,this.uploadService.tracksToModify[trackIndex][fieldName]),fieldName,this.uploadService.tracksToModify[trackIndex].validation)
  }*/

}

public removed(value:any,trackIndex,fieldName):void {

  this.uploadService.tracksToModify[trackIndex][fieldName] = this.uploadService.tracksToModify[trackIndex][fieldName].filter(function(item) {
    return item.id !== value.id;
  });

  this.uploadService.updateField(fieldName,value,trackIndex);

}

editTrackOriginalWorks(trackIndex) {
  this.editOriginalWorks = true;
  this.suggestedOriginalWorks = null;
  this.originalWorksSearchTerm = "";
  this.trackEditOriginalWorksIndex = trackIndex;
}

editTrackGigTypes(trackIndex) {
  this.editGigTypes = true;
  this.trackEditGigTypesIndex = trackIndex;
  console.log(this.uploadService.tracksToModify[this.trackEditGigTypesIndex]);
}

toggleTrackIsOriginal($event, trackIndex) {

  this.uploadService.tracksToModify[trackIndex].isOriginal = $event.target.checked;

  if(this.uploadService.tracksToModify[trackIndex].isOriginal) {
    this.uploadService.tracksToModify[trackIndex].originalWorks = [
      { name: this.uploadService.tracksToModify[trackIndex].name,
        artists: this.uploadService.tracksToModify[trackIndex].artistText,
        version: this.uploadService.tracksToModify[trackIndex].version,
        artistsFeatured: this.uploadService.tracksToModify[trackIndex].artistsFeaturedText,
        isOriginalWorkEntry: true
      }];
  } else {
    this.uploadService.tracksToModify[trackIndex].originalWorks = [];
  }
  this.uploadService.updateField('originalWorks', this.uploadService.tracksToModify[trackIndex].originalWorks, trackIndex);

}

toggleTrackIsOriginalForAll($event, tracks) {

  var modifiedTracks = tracks;

  for(var i = 0; i < modifiedTracks.length; i++) {

    modifiedTracks[i] = this.toggleTrackIsOriginal($event,modifiedTracks[i]);
    modifiedTracks[i].validation = this.uploadService.updateTrackValidationStatus(this.uploadService.validateTrackField('originalWorks',modifiedTracks[i].originalWorks),'originalWorks',modifiedTracks[i].validation);

  }

  return modifiedTracks;

}

replaceBadTrack(event, trackIndex) {

  var trackId = this.uploadService.tracksToModify[trackIndex]._id;
  console.log('this is the trackId:',trackId);
  event.target.files[0].trackIdToReplace = trackId;
  this.uploader.addToQueue(event.target.files);

}

addOriginalWorkToTrack(trackIndex,name,version,artists,featuredArtists, id) {
  var id = id || "";
  console.log(trackIndex,name,version,artists,featuredArtists);

  var originalWork = {
    name: name,
    version: version,
    artists:artists,
    artistsFeatured:featuredArtists,
    id: id
  };

  console.log(originalWork);
  this.uploadService.tracksToModify[this.uploadService.trackCurrentlyEditing].originalWorks.push(originalWork);
  this.uploadService.tracksToModify[this.uploadService.trackCurrentlyEditing].validation = this.uploadService.validateTrackField('originalWorks', this.uploadService.tracksToModify[this.uploadService.trackCurrentlyEditing].originalWorks);
  this.uploadService.updateField('originalWorks', this.uploadService.tracksToModify[this.uploadService.trackCurrentlyEditing].originalWorks, this.uploadService.trackCurrentlyEditing);
  console.log(this.uploadService.tracksToModify[this.uploadService.trackCurrentlyEditing].originalWorks);

}

removeOriginalWorkToTrack(originalWorkIndex) {
  this.uploadService.tracksToModify[this.uploadService.trackCurrentlyEditing].originalWorks.splice(originalWorkIndex,1);
}

removeGigTypesToTrack(gigTypesIndex) {
  this.uploadService.tracksToModify[this.trackEditGigTypesIndex].gigTypes.splice(gigTypesIndex,1);
}

getSuggestedOriginalWorks(criteria) {
  console.log('Attempting to search: ', criteria);

  this.originalWorks.searchOriginalWorks(criteria).subscribe(res =>  {

    var existingOriginalWorks = this.uploadService.tracksToModify[this.uploadService.trackCurrentlyEditing].originalWorks.map(function(originalWork) {
      return originalWork.id;
    });

    this.suggestedOriginalWorks = res.OriginalWorks.results.filter((originalWork) => {
      if(existingOriginalWorks.indexOf(originalWork._id) === -1 ) {
        return originalWork;
      }
    });
    if(this.suggestedOriginalWorks.length > 0) {
      this.showSuggestedOriginalWorks = true;
    } else {
      this.showSuggestedOriginalWorks = false;
    }
  });

  }

showOriginalWorks(originalWorks) {
  console.log(originalWorks);
}

setDragHover($event) {
  $event.preventDefault();
  this.areFilesDraggedOver = true;
}

endDragHover($event) {
  $event.preventDefault();
  this.areFilesDraggedOver = false;
}

setLogoFileToUpload(fileInput: any){
  var url = urlPrefix + '/api/v1/members/account/update';
  this.logoFileToUpload = fileInput.target.files[0];
  console.log(this.logoFileToUpload);
  this.uploadService.makeFileRequest(url, [], 'logo_upload', this.logoFileToUpload)
  .then((response:any) => {
    if(response && response.User) {
      this.account.profileData = response.User
    }
  });
}

getEditorProfile(editorId) {
  if(this.activeEditor) {
    this.activeEditor.logo = {};
    this.activeEditor.photo = {};
  }
  return this.http.get(urlPrefix + '/api/v1/members/editors/' + editorId + '/get')
  .map((res) => res.json())
  .subscribe((res) => {
    this.activeEditor = res.Editor;
    this.toggleEditorPanel();
    return res.Editor;
  });

}

setPhotoFileToUpload(fileInput: any){
  var url = urlPrefix + '/api/v1/members/account/update';

  this.photoFileToUpload = fileInput.target.files[0];
  this.uploadService.makeFileRequest(url, [], 'photo_upload', this.photoFileToUpload)
  .then((response:any) => {
    if(response && response.User) {
      this.account.profileData = response.User
    }
  });

}

logIt (message) {
  console.log(message);
}

ngOnInit() {

  console.log('hello `MemberHome` component');

  if(this.selectedCurrency && this.selectedCurrency.length > 0) {

    this.currency.getCurrency(this.selectedCurrency);
    this.currencyEditors.getCurrencyEditors(this.selectedCurrency);
    this.currencyCollections.getCurrencyCollections(this.selectedCurrency);
    this.currencyCrates.getCurrencyCrates(this.selectedCurrency);
    this.currencyCharts.getCurrencyCharts(this.selectedCurrency);
    this.tracks.getTracks(this.selectedCurrency, false, 1);

  }

}

updateUser() {
  this.account.updateUserData(this.account.profileData,this.logoFileToUpload,this.photoFileToUpload)
  .subscribe((res) => {
    this.account.profileData = res;
    console.log(this.account.profileData);
    return;
  });
}

playTrack(track) {
  var self = this;

  if(track.lowBitRateFile.url == this.appState.get('trackUrl')) {
    this.waveSurferService.wavesurfer.play();
  } else {
    this.appState.set('trackUrl',track.lowBitRateFile.url);
  }

  console.log(this.appState.get('trackUrl'));

    this.waveSurferService.wavesurfer.load(track.lowBitRateFile.url);
    console.log(track);
    this.waveSurferService.trackTitle = track.name;
    this.waveSurferService.trackVersion = track.version;
    this.waveSurferService.trackArtist = track.artistPrimaryName;
    this.waveSurferService.trackArtistsFeatured = track.artistsFeaturedDisplayName;
    this.waveSurferService.cleanDirty = track.cleanDirty;
    this.waveSurferService.versionType = track.versionType;
    this.waveSurferService.introType = track.introType;
    this.waveSurferService.outroType = track.outroType;
    self.appState.set('isPlaying',true);

    this.waveSurferService.wavesurfer.on('ready',()=> {
      self.waveSurferService.wavesurfer.play();
      self.waveSurferService.wavesurfer.unAll();
    });

    this.waveSurferService.wavesurfer.on('play', () => {
      self.appState.set('isPlaying',true);

    })

}

playTrackHi(track) {
  var self = this;

  if(track.lowBitRateFile.url == this.appState.get('trackUrl')) {
    this.waveSurferService.wavesurfer.play();
  } else {
    this.appState.set('trackUrl',track.hiBitRateFile.url);
  }

  console.log(this.appState.get('trackUrl'));

    this.waveSurferService.wavesurfer.load(track.hiBitRateFile.url);
    console.log(track);
    this.waveSurferService.trackTitle = track.name;
    this.waveSurferService.trackVersion = track.version;
    this.waveSurferService.trackArtist = track.artistPrimaryName;
    this.waveSurferService.trackArtistsFeatured = track.artistsFeaturedDisplayName;
    this.waveSurferService.cleanDirty = track.cleanDirty;
    this.waveSurferService.versionType = track.versionType;
    this.waveSurferService.introType = track.introType;
    this.waveSurferService.outroType = track.outroType;
    self.appState.set('isPlaying',true);

    this.waveSurferService.wavesurfer.on('ready',()=> {
      self.waveSurferService.wavesurfer.play();
      self.waveSurferService.wavesurfer.unAll();
    });

    this.waveSurferService.wavesurfer.on('play', () => {
      self.appState.set('isPlaying',true);

    })

}

pauseTrack() {
  this.appState.set('isPlaying',false);
}


uploadFile(parameter,data) {


}

toggleTrackUploadPanel() {

  if(this.showTrackUploadPanel) {
    this.showTrackUploadPanel = false;
    this.showUploadQueueTable = false;
    this.tracks.getTracks(this.selectedCurrency, false, 1);
  } else {
    this.showTrackUploadPanel = true;
    this.showUploadQueueTable = true;
    this.tracks.list = [];
    this.uploadService.getDraftTracks();
    this.tracksRemainingToBeUploaded = this.uploadService.tracksRemainingToBeUploaded = true;

  }


}

submitApprovedTracks() {
  this.editOriginalWorks = false;
  for (var i = 0; i < this.uploadService.tracksToModify.length; i++) {
    if(this.uploadService.tracksToModify[i].validation && this.uploadService.tracksToModify[i].validation.isTrackValid) {
      this.uploadService.submitValidatedTrack(this.uploadService.tracksToModify[i]).subscribe((res) => {
        this.uploadService.tracksToModify = this.uploadService.tracksToModify.splice(i,1);
        this.tracks.list.push(res.Track);
      });
    }
  }
}

addFilesToQueue($event) {
  this.uploadService.addFilesToQueue($event);
  this.areFilesDraggedOver = false;

}

toggleProfilePanel() {
  if(this.showProfilePanel) {
    this.showProfilePanel = false;
  } else {

    this.account.getUserData()
    .subscribe((res) => {
      this.account.profileData = new User();
      this.account.profileData = Object.assign(this.account.profileData, res);
      console.log(this.account.profileData);
      this.showProfilePanel = true;
      console.log(this.account.profileData);

      return;
    });
  }

}

selectCurrency(currencyId) {

  if(this.showTrackUploadPanel) {
    this.toggleTrackUploadPanel();
  }

  this.selectedCurrency = currencyId;
  this.ngOnInit();

};

setKey(key,index) {
  //jcf.replaceAll();
  if(key.length > 0) {
    this.rules[index].key = key;
    var type = this.rules[index].type = this.availableCriteriaSettings[key].type;
    if(this.availableCriteriaSettings[key].type == 'list') {
      this.rules[index].options = this[key].list;
    }
    this.rules[index].availableOperators = this.operators[type];

    //  this.rules[index].type = this.availableCriteria[value].type;
  }
}

setOperator(value,index) {
  //  jcf.replaceAll();
  this.rules[index].selectedOperator = value;
}

setValue(value,index) {
  //jcf.replaceAll();

  this.rules[index].value = value;
}

searchByAutocomplete(value) {
  this.autocompleteQuery = value;
}

sortOrder(value) {
  this.sortByColumn = value;

  if(this.sortByColumn === value && this.sortDirection == "") {
    this.sortDirection = '-';
  } else {
    this.sortDirection = '';
  }
  this.sortBy = this.sortDirection + this.sortByColumn;
  this.updateTracks(this.rules,1);
}

onScrollTowardsBottomOfTracksList () {

  if(this.tracks.currentPage < this.tracks.totalPages) {
    var nextPage = this.tracks.currentPage + 1;

    if(!this.tracks.isUpdating) {
      this.updateTracks(this.rules,nextPage);
    }
  }

}

downloadHiBitRateTrack(trackId) {
  this.tracks.downloadHiBitRateTrack(trackId).subscribe(res => {
    window.location.href = res.url;
  });
}

updateTracks(rules,nextPage) {

  var pageNumber = nextPage || 1;
  /*    if(type == 'minYear') {
  this.filters.minYear = id;
}

if(type == 'maxYear') {
this.maxYear = id;
}

if(type == 'startBpm') {
this.startBpm = id;
}

if(type == 'endBpm') {
this.endBpm = id;
}*/

this.selectedMainGenres = [];
this.selectedCollections = [];
this.selectedKeys = [];
this.selectedTags = [];
this.selectedEditors = [];
this.minYear = null;
this.maxYear = null;
this.startBpm = null;
this.endBpm = null;

for(var i = 0; i < this.rules.length; i++) {

  switch(this.rules[i].key) {

    case "genres": {
      this.selectedMainGenres.push(this.rules[i].value);
      break;
    }

    case "currencyCollections": {
      this.selectedCollections.push(this.rules[i].value);
      break;
    }
    case "year": {
      if(this.rules[i].selectedOperator == ">") {
        this.minYear = this.rules[i].value;
      }
      if(this.rules[i].selectedOperator == "<") {
        this.maxYear = this.rules[i].value;
      }
      break;
    }
    case "bpm": {
      if(this.rules[i].selectedOperator == ">") {
        this.startBpm = this.rules[i].value;
      }
      if(this.rules[i].selectedOperator == "<") {
        this.endBpm = this.rules[i].value;
      }
      break;

    }

    case "keys": {
      this.selectedKeys.push(this.rules[i].value);
      break;
    }
    case "editor": {
      this.selectedEditors.push(this.rules[i].value);
      break;
    }
    case "tags": {
      this.selectedTags.push(this.rules[i].value);
      break;
    }
  }
}

var filters = {

  mainGenres: this.selectedMainGenres,
  collections: this.selectedCollections,
  keys: this.selectedKeys,
  tags: this.selectedTags,
  editors: this.selectedEditors,
  release: this.release,
  minYear: this.minYear,
  maxYear: this.maxYear,
  startBpm: this.startBpm,
  endBpm: this.endBpm,
  sortBy: this.sortBy,
  autocompleteQuery: this.autocompleteQuery
};

this.tracks.getTracks(this.selectedCurrency,filters, pageNumber);

}

showTracksInRelease(releaseId) {
  this.release = releaseId;
  this.temporaryFilter = 'release';
  this.tracks.getTracks(this.selectedCurrency,{release: releaseId}, 1);
}

showSimilarTracks(fieldName, fieldValue) {
  this.temporaryFilter = fieldName;
  this.tracks.getTracks(this.selectedCurrency,{autocompleteQuery: fieldValue}, 1);
}

filterByCollection(fieldValue) {
  this.temporaryFilter = 'collection';
  this.tracks.getTracks(this.selectedCurrency,{collections: [fieldValue]}, 1);
}

removeTemporaryFilter() {
  this.temporaryFilter = '';
  this.showProfilePanel = false;
  this.showEditorPanel = false;
  this.updateTracks(this.rules, this.tracks.currentPage);
}

addNewRule($event) {
  $event.preventDefault();
  this.rules.push({options:null ,type:'', selectedOperator:'', availableOperators:{},value:'',key:''});
  //  jcf.replaceAll();
}

setNewRule(collectionId) {
  this.rules.push(
    {
      options:this.currencyCollections.list,
      type:'list',
      selectedOperator:'==',
      availableOperators:this.operators['list'],
      value:collectionId,
      key:'currencyCollections'
    });
    this.updateTracks(this.rules,1);

  }

  resetRules() {
    this.rules = [];
    this.rules.push({options:null ,type:'',selectedOperator:'',availableOperators:{},value:'',key:''});
    this.updateTracks(this.rules,1);

  }

  removeRule($event,i) {
    if(this.rules.length > 1) {
      $event.preventDefault();
      this.rules.splice(i,1);
    }
    //  jcf.replaceAll();
  }

  toggleEditorPanel() {
    if(this.showEditorPanel) {
      this.showEditorPanel = false;
    } else {
      this.showEditorPanel = true;
    }
  }

  getPropertyValue(category,id) {
    var list = this[category].list;
    var displayName = null;
    for (var i = 0; i < list.length; i++) {
      if(list[i]._id == id) {
        displayName = list[i].name;
      }
    }
    return displayName;
  }

  toggleTrackEditor(trackIndex) {
    this.uploadService.trackCurrentlyEditing = trackIndex;
  }

  prepMultipleSelectElementForTrackUpload(element, property, trackIndex, limit) {
    console.log('got called back');
    var selectedValues;
    selectedValues = Array.apply(null,element.options)
    .filter(option => option.selected);

    if(selectedValues.length >= limit) {
      console.log('hit limit');

    }

    selectedValues = Array.apply(null,element.options)
    .filter(option => option.selected)
    .map(option => option.value);

    //console.log(element, property, trackIndex, limit, selectedValues);
    var returnProperty = {};
    returnProperty[property] = selectedValues;
    this.tracks.updateTrackProperty(returnProperty, trackIndex);

  }

}
