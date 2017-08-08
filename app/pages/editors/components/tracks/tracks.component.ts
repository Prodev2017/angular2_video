import {Component, ViewEncapsulation, ViewChild} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import { GlobalState } from '../../../../global.state';
import { AppState } from '../../../../app.service';
import {Http, Headers, RequestOptions} from '@angular/http';
import { TrackService, Currency, Account, EditorService, KeyService, TagService, Genres, AuthService } from '../../../../theme/services';
import { Router,ActivatedRoute, Params } from '@angular/router';
import {SelectItem, OverlayPanel, Button, ToggleButton, ContextMenu, MenuItem, Dropdown} from 'primeng/primeng';
import { ModalModule, ModalDirective } from 'ng2-bootstrap/ng2-bootstrap';

declare var jQuery;
declare var $;

@Component({
  selector: 'editor-tracks',
  template: require('./tracks.html'),
  styles: [require('./tracks.scss')]
})

export class EditorTracksComponent {
  @ViewChild('trackTable') trackTable:any;
  @ViewChild('sidebar') sidebar:any;

  query: string = '';
  trackCurrentlyLoaded:any = {};
  tracksToPurchase:any = [];
  isPlayerPlaying:boolean;
  columnOptions: SelectItem[];
  contextMenuItemsForTableColumns:any;
  selectedCurrency:any;
  creditBalance:number;
  insufficientCredits:boolean;
  currencyPackages:Array<any> = [];
  selectedPackageId:string;
  showCrateEditor:boolean = false;
  tableHeight:string = "60vh";
  selectedCurrencyId:string;
  selectedTab:string;
  activeStoreTab:string = "Charts";
  currentYear:any = new Date().getFullYear();
  downloadQueue:any = {tracks: []};
  currentlyAppliedCrate:any = {name: ''};
  activeTab:string = 'crates';
  crates:any;
  showFilters:boolean = false;
  filterListBoxHeight:string = '160px';
  filterListBoxFontSize:string = '10px';
  tabChange:any;
  selectedAccountingPeriod:any;
  accountingPeriods:any = [];
  toggleTrackSelection:boolean = false;
  tracksSelected:Array<any> = [];
  collections:Array<any> = [];
  accountData:any;
  loaded:boolean = false;
  accountingData:any = {};
  events:Array<any> = [];

    trackColumns:Array<any> = [
    {label:'Added', value:'added'},
    {label:'Editor', value:'editor'},
    {label:'Artist', value:'artist'},
    {label:'BPM', value:'bpm'},
    {label:'Key', value:'key'},
    {label:'Tags', value:'tags'},
    {label:'Genres', value:'genres'},
    {label:'Download Count', value:'downloadCountForPeriod'},
    {label:'Year', value:'year'},
    {label:'Time', value:'time'}
  ];

  trackColumnsSelected:Array<any> = ['added','editor','artist','bpm','key','tags','genres','year','time', 'downloadCountForPeriod'];


  selectedCollection:any;

  loadedCollection:any = {
    name: null,
    description: null,
    tracks: [],
    _id: null
  };

  //Currency Data Lists
  currencyEditors:Array<any> = [];
  keyList:Array<any> = [];
  tagList:Array<any> = [];
  genresList:Array<any> = [];

  //Filters
  trackListFilters:any = {
    minYear: 1950,
    maxYear: new Date().getFullYear(),
    editors: [],
    artistName: '',
    startBpm: 0,
    endBpm: 250,
    keys: [],
    tags: [],
    genres: [],
    trackName: '',
    sortField: 'publishDate',
    sortOrder: 1,
    rows: 25,
    _id: null,
    name: null,
    accountingPeriod: null,
    type: 'collection',
    description: null,
    tracks: []
  };


    trackColumnWidths:any = {

    added: 7,
    editor: 10,
    artist: 15,
    bpm: 5,
    key: 5,
    title: 15,
    tags: 10,
    genres: 10,
    releaseYear: 5,
    trackLength: 5,
    actions: 13

  }
  dataLoading:boolean = false;


  constructor(public tracks: TrackService,
    public _state:GlobalState, public router:Router,
    public http:Http, private route: ActivatedRoute, public currency:Currency,
    public account:Account, public appState:AppState,
    public editors:EditorService, public keys:KeyService,
    public authService:AuthService, public genres:Genres, public tags:TagService) {

      this.keys.getKeys();
      this.tags.getTags();
      this.genres.getGenres();

            this.events.push(this._state.subscribe('keys.loaded', (data) => {

        this.keyList = this.keys.list.map( (key) => {
          return {label: key.name, value: key._id }
        });

      }));

      this.events.push(this._state.subscribe('tags.loaded', (data) => {

        this.tagList = this.tags.list.map( (tag) => {
          return {label: tag.name, value: tag._id }
        });

      }));

      this.events.push(this._state.subscribe('genres.loaded', (data) => {

        this.genresList = this.genres.list.map( (genre) => {

          return {label: genre.name, value: genre.id }

        });

      }));

      var pageNumber = 1;

      this.events.push(this._state.subscribe('collections.refresh', (currencyId) => {

        this.account.getAccountData().subscribe( (res) => {

          this.currency.getMyEditorCollections(currencyId, res.User._id).subscribe( (res) => {

            this.collections = res.Collections.map( (item) => {

              return { label: item.name, value: item };

            });

            this.loadedCollection = res.Collections[0];

          });

        });

      }));

      this.events.push(this._state.subscribe('currency.changed', (currency) => {
        this.setCurrency(currency);
      }));

      this._state.notifyDataChanged('menu.activeLink', {title: "Track List"});

      this.events.push(this._state.subscribe('trackList.columnsChanged', (data) => {
        console.log(data);
        this.trackColumnsSelected = data.selectedColumns;

      }));

      this.events.push(this._state.subscribe('player.play', () => {
        this.isPlayerPlaying = true;
      }));

      this.events.push(this._state.subscribe('player.pause', () => {
        this.isPlayerPlaying = false;
      }));

      this.events.push(this._state.subscribe('player.toggle', (data) => {

        this.trackCurrentlyLoaded = data;

      }));




    }

    setCurrency(currency) {
                                        this._state.notifyDataChanged('spinner.show', {});

                              console.log('currency changed on editor track list');

        this.account.getAccountData().subscribe( (res) => {

          this.currency.getMyEditorCollections(currency._id, res.User._id).subscribe( (res) => {

            this.collections = res.Collections.map( (item) => {

              return { label: item.name, value: item };

            });

          });

        });

        this.loadTracksAndAccounting(currency);



    }


    loadTracksAndAccounting (currency) {
                                              this._state.notifyDataChanged('spinner.show', {});

              var currencyId = currency._id;
        this.selectedCurrencyId = currencyId;
        this.selectedCurrency = currency;
        if(!currencyId) {
          //currencyId = "573acfcf0424de743256b6ec";
          //this.router.navigate(['/pages/tracks']);
          console.log('cannot find a currency id')

        } else {

          this.currency.getAccountingPeriods(this.selectedCurrencyId).subscribe( (res) => {

            this.accountingPeriods = res.AccountingPeriods.map( (item) => {

              return {label: item.name, value: item };

            });

            this.selectedAccountingPeriod = res.AccountingPeriods[0];

            this.trackListFilters.accountingPeriod = (res.AccountingPeriods && res.AccountingPeriods.length > 0) ? res.AccountingPeriods[0]._id : null;

            this.filterTrackList();


          });



        }





    }

    adjustTableHeight() {

      var storeControlsHeight = 90;

      if(this.trackTable) {

        var tableHeader = this.trackTable.el.nativeElement.querySelector('.ui-datatable-scrollable-header');
        var tableBody = this.trackTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body');

        var contentAreaHeight = this.trackTable.el.nativeElement.offsetParent.offsetParent.offsetParent.clientHeight;
        if(tableHeader && tableHeader.clientHeight) {
          var tableHeaderHeight = tableHeader.clientHeight;
          if(this.showFilters) {
            var tableBodyHeight = contentAreaHeight - storeControlsHeight - tableHeaderHeight - 290;
          } else {
            var tableBodyHeight = contentAreaHeight - storeControlsHeight - tableHeaderHeight - 40;
          }

          tableBody.style.maxHeight = (tableBodyHeight) + 'px';
          tableBody.style.height = (tableBodyHeight) + 'px';
        }

      }

      if (this.sidebar) {
        var contentAreaHeight = this.sidebar.nativeElement.offsetParent.offsetParent.offsetParent.clientHeight,
          height = contentAreaHeight - storeControlsHeight;
        if (this.showFilters) {
          height = height - 290;
        } else {
          height = height - 40;
        }
        this.sidebar.nativeElement.style.maxHeight = (height) + 'px';
        this.sidebar.nativeElement.style.height = (height) + 'px';
      }

    }

    ngDoCheck() {
      //TODO: fix check
      // this.adjustTableHeight();

    }

    ngOnInit() {


    }

    ngAfterViewInit() {

            this.setCurrency(this.currency.selectedCurrency);


    }

    ngOnDestroy() {

      console.log('the events that we will unsubscribe from', this.events);
      for(var i = 0; i < this.events.length; i++) {

        this._state.unsubscribe(this.events[i].event, this.events[i].callback);

      }

      this.events = [];

    }

    selectAccountingPeriod() {
      console.log(this.selectedAccountingPeriod);
      this.trackListFilters.accountingPeriod = this.selectedAccountingPeriod._id;
      this.filterTrackList();

    }

    clearCollectionFromView() {

      this.trackListFilters = {
        minYear: 1950,
        maxYear: new Date().getFullYear(),
        editors: [],
        artistName: '',
        startBpm: 0,
        endBpm: 250,
        keys: [],
        tags: [],
        genres: [],
        trackName: '',
        sortField: '',
        sortOrder: 1,
        rows: 25,
        _id: null,
        name: null,
        accountingPeriod: null,
        type: 'collection',
        description: null,
        tracks: []

      };
      this.loadedCollection = {
        name: null,
        description: null,
        tracks: [],
        _id: null
      };

      this.filterTrackList();


    }

    filterTrackList($event?) {
      $event = $event || {};

      console.log('this is the event object', $event);

      if($event && $event.sortField) {

        this.trackListFilters.sortField = $event.sortField;
        this.trackListFilters.sortOrder = $event.sortOrder;

      }

      if($event && $event.rows) {

        this.trackListFilters.rows = $event.rows;
        if($event.first != 0) {
          this.trackListFilters.currentPage = 1 + ($event.first / this.trackListFilters.rows);
        } else {
          this.trackListFilters.currentPage = 1;
        }

      }

      if(this.selectedCurrencyId) {
        this.dataLoading = true;
                                                this._state.notifyDataChanged('spinner.show', {});

        this.account.getMyUploadedTracks(this.selectedCurrencyId, this.trackListFilters, this.trackListFilters.currentPage).subscribe( (res) => {

          this.tracks.isUpdating = false;
          this.tracks.currentPage = res.Tracks.currentPage;
          this.tracks.totalPages = res.Tracks.totalPages;
          this.tracks.totalRecords = res.Tracks.total;
          this.tracks.list = res.Tracks.results;
          this.accountingData = res.Accounting;
                                                          this._state.notifyDataChanged('spinner.hide', {});

        });

      }

      this.showFilters = false;

    }

    togglePlayPause (track) {

      var trackPlayerData = {
        name: track.name  || '[title not set]',
        version: track.version || '[version not set]',
        artistPrimaryName: track.artistPrimaryName  || '[artist not set]',
        artistsFeaturedPrimaryName: track.artistsFeaturedPrimaryName,
        _id: track._id,
        url: track.publishedLowBitRateFile.url || track.hiBitRateFile.url,
        waveformUrl: track.waveformImageSnippetFileUrl,
        fileType: track.fileType
      }

      console.log(track);

      this._state.notifyDataChanged('player.toggle', trackPlayerData);

    }

    toggleFilterPanel() {

      this.showFilters = !this.showFilters;

    }


    getCollection() {

      this.currency.getCollection(this.selectedCurrencyId, this.selectedCollection._id).subscribe( (res) => {

        this.tracks.currentPage = 1;
        this.tracks.totalPages = 1;
        this.tracks.totalRecords = res.Collection.tracks.length;
        this.tracks.list = res.Collection.tracks;
        this.loadedCollection = res.Collection;
        this.tracksSelected = [];

      });

    }

                  isTrackColumnSelected(column) {

                return this.trackColumnsSelected.indexOf(column) !== -1;

              }

    createCollection() {

      var selectedTrackIds = this.tracksSelected.map( (item) => {
        return item._id;
      });

      this.loadedCollection.tracks = selectedTrackIds;

      this.currency.createCollection(this.selectedCurrencyId, this.loadedCollection).subscribe( (res) => {

        this._state.notifyDataChanged('growlNotifications.update', {
          severity:'info',
          summary:'Collection Created',
          detail: ''}
        );
        this.loadedCollection = res.Collection;
        this.tracksSelected = [];
        this._state.notifyDataChanged('collections.refresh', this.selectedCurrencyId);

      });

    }

    removeTracksFromCollection() {

      for(var i = 0; i < this.tracksSelected.length; i++) {

        var indexToRemove = this.tracks.list.findIndex( (item) => {

          return this.tracksSelected[i]._id == item._id;

        });

        this.tracks.list.splice(indexToRemove, 1);

      }
      this.tracksSelected = [];

      this.updateCollection();

    }

    updateCollection() {

      this.loadedCollection.tracks = this.tracks.list;

      this.currency.updateCollection(this.selectedCurrencyId, this.loadedCollection).subscribe( (res) => {

        this._state.notifyDataChanged('growlNotifications.update', {
          severity:'info',
          summary:'Collection Updated',
          detail: ''}
        );

        this.getCollection();

      });

    }

    addTracksToCollection() {

      var selectedTrackIds = this.tracksSelected.map( (item) => {
        return item._id;
      });

      this.loadedCollection.tracks = this.loadedCollection.tracks.concat(selectedTrackIds);

      this.currency.updateCollection(this.selectedCurrencyId, this.loadedCollection).subscribe( (res) => {

        this._state.notifyDataChanged('growlNotifications.update', {
          severity:'info',
          summary:'Collection Updated',
          detail: ''}
        );

        this.getCollection();

      });

    }

  }
