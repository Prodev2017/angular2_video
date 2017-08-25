import {Component, ViewEncapsulation, ViewChild, ElementRef} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import { GlobalState } from '../../../../global.state';
import { AppState } from '../../../../app.service';
import {Http, Headers, RequestOptions, ResponseContentType, Response} from '@angular/http';
import { TrackService, Currency, Account, EditorService, KeyService, TagService, Genres } from '../../../../theme/services';
import { saveAs } from 'file-saver';
import { Router,ActivatedRoute, Params } from '@angular/router';
import {SelectItem, OverlayPanel, Button, ToggleButton, ContextMenu, MenuItem} from 'primeng/primeng';
import { ModalModule, ModalDirective } from 'ng2-bootstrap/ng2-bootstrap';
import { PackagePurchase } from './packagePurchase.class';
var async = require('async');


declare var jQuery;
declare var $;
declare var paypal;

@Component({
  selector: 'tracks',
  styles: [require('./trackList.scss')],
  template: require('./trackList.html')
})

export class TrackList {
  
  @ViewChild('packagePurchaseModal') public packagePurchaseModal:ModalDirective;
  @ViewChild('trackTable') trackTable:any;
  @ViewChild('storeControls') storeControls:any;
  @ViewChild('transactionTable') transactionTable:any;
  @ViewChild('payPalButton') payPalButton:ElementRef;
  @ViewChild('sidebar') sidebar:any;

  query: string = '';
  trackCurrentlyLoaded:any = {};
  tracksToPurchase:any = [];
  isPlayerPlaying:boolean;
  trackColumns:Array<any> = [
    {label:'Added', value:'added'},
    {label:'Editor', value:'editor'},
    {label:'Artist', value:'artist'},
    {label:'BPM', value:'bpm'},
    {label:'Key', value:'key'},
    {label:'Tags', value:'tags'},
    {label:'Genres', value:'genres'},
    {label:'Year', value:'year'},
    {label:'Time', value:'time'}
  ];
  
  trackColumnsSelected:Array<any> = ['added','editor','artist','bpm','key','tags','genres','year','time'];
  columnOptions: SelectItem[];
  contextMenuItemsForTableColumns:any;
  selectedCurrency:any;
  selectedCurrencyCreditBalance:number;
  insufficientCredits:boolean;
  currencyPackages:Array<any> = [];
  selectedPackageId:string;
  showCrateEditor:boolean = false;
  tableHeight:string = "60vh";
  selectedCurrencyId:string;
  selectedTab:string;
  activeStoreTab:string = "Charts";
  currentYear:any = new Date().getFullYear();
  tableScrollHeight:string;
  downloadQueue:any = {tracks: []};
  currentlyAppliedCrate:any = {name: ''};
  activeTab:string = 'crates';
  crates:any;
  selectedEditor:any;
  charts:any = {allTimeRankings: [], currentMonthRankings: [], lastMonthRankings: [] };
  showFilters:boolean = false;
  showingTopTracks:boolean = false;
  filterListBoxHeight:string = '160px';
  filterListBoxFontSize:string = '10px';
  tabChange:any;
  collections:any;
  events:Array<any> = [];
  tracksSelected:Array<any> = [];
  transactions:Array<any> = [];
  selectedCollectionId:string;
  trackListRestrictions:string;
  //Currency Data Lists
  currencyEditors:Array<any> = [];
  keyList:Array<any> = [];
  tagList:Array<any> = [];
  genresList:Array<any> = [];
  displayTable:boolean = true;
  
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
    rows: 50,
    _id: null,
    textSearchField: null,
    name: null
  };
  
  trackColumnWidths:any = {
    
    added: 10,
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
    public genres:Genres, public tags:TagService) {
      
      this.keys.getKeys();
      this.tags.getTags();
      this.genres.getGenres();
      
      this.selectedCurrencyCreditBalance = this.currency.selectedCurrency.creditBalance;
      
      this.tabChange = this.route.params.subscribe(params => {
        var routes = ['crates','collections','download-queue','library','transactions'];
        
        this.trackListRestrictions = null;
        this.showFilters = false;
        this.trackListFilters.currentPage = 1;
        this.trackListFilters.textSearchField = null;

        if(routes.indexOf(params['view']) !== -1) {
          this.activeTab = params['view']; // (+) converts string 'id' to a number
          
        } else {
          this.router.navigate(['/pages/tracks/crates']);
        }
        
        this._state.notifyDataChanged('tracks.route.changed', this.activeTab);
        
        
        });
      
      this.columnOptions = [];
      for(let i = 0; i < this.trackColumns.length; i++) {
        this.columnOptions.push({label: this.trackColumns[i], value: this.trackColumns[i] });
      }
      
      this.events.push(this._state.subscribe('tracks.route.changed', (view) => {
        console.log('route change event triggered ');
        
        
        this.filterTrackList();   
        
        
      }));
      
          this.events.push(this._state.subscribe('trackAction.execute', (data) => {
      console.log('got action and track', data);
      if(data.action == 'addTrackToDownloadQueue') {
        
        this.addTrackToDownloadQueue(data.track);
        
      }
      
      if(data.action == 'purchaseAndDownload') {
        
        this.downloadTrack(data.track,true);
        
      }
      
      if(data.action == 'purchase') {
        
        this.downloadTrack(data.track,false);
        
      }
      
    }))
      
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
      
      
      this.events.push(this._state.subscribe('download.purchase', () => {
        
        this.currency.getCurrencies().subscribe( (res) => {
          
          this.currency.list = res.Currencies;
          this.selectedCurrency = this.currency.list.find( (item) => {
            
            return item._id == this.currency.selectedCurrency._id;
            
          });
          
          console.log(this.selectedCurrency);
          
          this.getDownloadQueueForCurrency([]);
          
          
        });
        
        
      }));
      
      this.events.push(this._state.subscribe('currency.changed', (currency) => {
        this.setCurrency(currency);        
      }));
      
      this.events.push(this._state.subscribe('tracks.getPurchaseableList', () => {
        
        this.tracks.getTracks(this.selectedCurrencyId,{},1).subscribe(
          (res) => {
            
            this.tracks.isUpdating = false;
            this.tracks.currentPage = res.Tracks.currentPage;
            this.tracks.totalPages = res.Tracks.totalPages;
            this.tracks.totalRecords = res.Tracks.total;
            
            if(pageNumber == 1) {
              this.tracks.list = res.Tracks.results;
            } else {
              this.tracks.list = this.tracks.list.concat(res.Tracks.results);
            }
            
          });
          
        }));
        
        this.events.push(this._state.subscribe('crateEditor.toggle', () => {
          
          this.showCrateEditor = !this.showCrateEditor;
          
        }));
        
        
        
        this.events.push(this._state.subscribe('trackList.columnsChanged', (data) => {
          console.log(data);
          this.trackColumnsSelected = data.selectedColumns;
          
        }));
        
        this.events.push(this._state.subscribe('library.retrieve', (data) => {
          this.tracks.list = [];
          this.tracksSelected = [];
          this._state.notifyDataChanged('spinner.show', {});
          
          this.tracks.getLibrary(this.selectedCurrencyId, this.trackListFilters, this.trackListFilters.currentPage).subscribe( (res) => {
            
            this.tracks.list = res.Tracks.results;
            this.tracks.totalRecords = res.Tracks.total;
            
            if(res.restrictions) {
              
              switch(res.restrictions) {
                
                case 'no-valid-transactions':
                this.trackListRestrictions = 'You have not purchased a package in more than 30 days. To access your library, please purchase a new package.';
                break;
                
              }
              
              
            }
            
            this._state.notifyDataChanged('spinner.hide', {});
            
          });
          
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
        
        this.events.push(this._state.subscribe('currency.balanceUpdate', (data) => {
          
          this.selectedCurrency.creditBalance = data;
          
        }));
        
        
      }
      
      ngOnDestroy() {
        
        this.tabChange.unsubscribe();
        console.log('the events that we will unsubscribe from', this.events);
        for(var i = 0; i < this.events.length; i++) {
          
          this._state.unsubscribe(this.events[i].event, this.events[i].callback);
          
        }
        
        this.events = [];
        
      }
      
      clickPayPalButton() {
        
        console.log(this.payPalButton);
        
        this.payPalButton.nativeElement.click();
        
      }
      
      ngOnInit(){
        
        var hostnameComponents = window.location.hostname.split('.');
        var hostnameComponentsCount = hostnameComponents.length;
        var currentEnvironment;
        
        if( hostnameComponents[hostnameComponentsCount - 2] == 'crooklynclan' && hostnameComponents[hostnameComponentsCount - 1] == 'net') {
          
          currentEnvironment = 'production';
          
        } else {
        
          currentEnvironment = 'sandbox';

        }
        
        paypal.Button.render({
          
          env: currentEnvironment, // Optional: specify 'sandbox' environment
          style: {
            label: 'checkout', // checkout | credit | pay
            size:  'responsive',    // small | medium | responsive
            shape: 'pill',     // pill | rect
            color: 'gold'      // gold | blue | silver
          },
          
          payment: (resolve, reject) => {
            
            var CREATE_PAYMENT_URL = '/api/v1/members/package/'+ this.selectedPackageId +'/createPayment';
            
            paypal.request.post(CREATE_PAYMENT_URL)
            .then( (data) => { resolve(data.id); })
            .catch((err) => { reject(err); });
            
          },
          
          onAuthorize: (data) => {
            
            console.log('onAuthorize', data);
            // Note: you can display a confirmation page before executing
            
            var EXECUTE_PAYMENT_URL = '/api/v1/members/package/'+ this.selectedPackageId +'/executePayment';
            this._state.notifyDataChanged('spinner.show', {});
            paypal.request.post(EXECUTE_PAYMENT_URL,
              { paymentID: data.paymentID, payerID: data.payerID, agreementID: data.paymentToken })
              
              .then( (data) => { 
                console.log('paypal data success', data) 
                if(data.Purchase.success) {
                  
                  
                  this._state.notifyDataChanged('spinner.hide', {});
                  this.packagePurchaseModal.hide();
                  
                  this._state.notifyDataChanged('growlNotifications.update', {
                    severity:'info',
                    summary:'Credits Purchased',
                    detail: 'Thank you for purchasing.'}
                  );
                  this.currency.getCurrencies().subscribe( (res) => {
                    
                    this.currency.list = res.Currencies;
                    this.selectedCurrencyCreditBalance = this.currency.list.filter( (item) => {
                      return item._id == this.selectedCurrencyId;
                    })[0].creditBalance;
                    
                  })                  
                }
                
              })
              .catch( (err) => { console.log('paypal error', err);                   
              this._state.notifyDataChanged('growlNotifications.update', {
                    severity:'error',
                    summary:'Error Completing Payment',
                    detail: err}
                  );
 });
            }
            
          }, '#paypal-button');
          
        }
        
        ngAfterViewInit() {
          
          this.setCurrency(this.currency.selectedCurrency);
          
        }
        
        setCurrency(currency) {

          var currencyId = currency._id;
          
          if(!currencyId) {
            //currencyId = "573acfcf0424de743256b6ec";
            //this.router.navigate(['/pages/tracks']);
            console.log('cannot find a currency id')
            
          } else {
            this.selectedCurrencyId = currencyId;
            this.selectedCurrency = currency;
            this.currency.getCurrencies().subscribe( (res) => {
              
              this.currency.list = res.Currencies;
              this.selectedCurrencyCreditBalance = this.currency.list.filter( (item) => {
                return item._id == this.selectedCurrencyId;
              })[0].creditBalance;
              this.clearCurrentCrate();
              this.trackListRestrictions = null;
              
            })
            
          }
          
          this.editors.getCurrencyEditors(currency._id).subscribe( (res) => {
            
            this.currencyEditors = res.CurrencyEditors.map( (editor) => {
              return {label: editor.stageName, value: editor._id }
            });


          });
          
                    this.currency.getCollections(currency._id).subscribe( (res) => {
            
            this.collections = res.Collections;


          });
          
                    this.currency.getCharts(currency._id).subscribe( (res) => {
            
            this.charts.allTimeRankings = [].concat(res.Charts).sort(function(a,b) {
               if (a.allTimeRanking < b.allTimeRanking)
                  return -1;
                if (a.allTimeRanking > b.allTimeRanking)
                  return 1;
                return 0;
            });
            
            this.charts.currentMonthRankings = [].concat(res.Charts).sort(function(a,b) {
               if (a.currentMonthRanking < b.currentMonthRanking)
                  return -1;
                if (a.currentMonthRanking > b.currentMonthRanking)
                  return 1;
                return 0;
            });
            
            this.charts.lastMonthRankings = [].concat(res.Charts).sort(function(a,b) {
               if (a.lastMonthRanking < b.lastMonthRanking)
                  return -1;
                if (a.lastMonthRanking > b.lastMonthRanking)
                  return 1;
                return 0;
            });
            
          })
          

          this.currency.getCrates(currency._id).subscribe( (res) => {
            
            this.crates = res.Crates.map( (collection) => {
                if(collection.type == 'collection') {
                  
                  collection.description = collection.editorOwner.stageName + '\r\n\r\n\r\n' + collection.description;
                }
              return collection;
            });
            
          });
          
          
          
        }
        
        outputSettings() {
          //  console.log(this.trackColumnsSelected);
        }
        
        columnSort(event) {
          
          //console.log(event);
          
        }
        
        startSearch() {
          
        }
        
        loadTracksLazy(event) {
          
          //console.log(event);
          
        }
        
        getLibraryForCurrency() {
          
          this._state.notifyDataChanged('library.retrieve', () => {});
          
        }
        
        getPurchaseableTrackList () {
          
          this._state.notifyDataChanged('tracks.getPurchaseableList', () => {})
          
        }
        
        refreshTable() {
          
        
        }

        adjustTableHeight() {
          
          if(this.trackTable && this.storeControls) {
            
            var tableHeader = this.trackTable.el.nativeElement.querySelector('.ui-datatable-scrollable-header');
            var tableBody = this.trackTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body');
            
            var storeControls = this.storeControls.nativeElement;
            
            var contentAreaHeight = storeControls.offsetParent.clientHeight;
            if(tableHeader && tableHeader.clientHeight) {
              var tableHeaderHeight = tableHeader.clientHeight;
              var storeControlsHeight = storeControls.clientHeight;
              if(this.showFilters) {
                var tableBodyHeight = contentAreaHeight - storeControlsHeight - tableHeaderHeight - 340;            
              } else {
                var tableBodyHeight = contentAreaHeight - storeControlsHeight - tableHeaderHeight - 90;            
              }
              
              this.tableScrollHeight = tableBody.style.maxHeight = (tableBodyHeight) + 'px';
              this.tableScrollHeight = tableBody.style.height = (tableBodyHeight) + 'px';
              
            }
            
          }
          
          if(this.transactionTable && this.storeControls) {
            
            var tableHeader = this.transactionTable.el.nativeElement.querySelector('.ui-datatable-scrollable-header');
            var tableBody = this.transactionTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body');
            
            var storeControls = this.storeControls.nativeElement;
            
            var contentAreaHeight = storeControls.offsetParent.clientHeight;
            if(tableHeader && tableHeader.clientHeight) {
              var tableHeaderHeight = tableHeader.clientHeight;
              var storeControlsHeight = storeControls.clientHeight;
              if(this.showFilters) {
                var tableBodyHeight = contentAreaHeight - storeControlsHeight - tableHeaderHeight - 290;            
              } else {
                var tableBodyHeight = contentAreaHeight - storeControlsHeight - tableHeaderHeight - 40;            
              }
              
              this.tableScrollHeight = tableBody.style.maxHeight = (tableBodyHeight) + 'px';
              this.tableScrollHeight = tableBody.style.height = (tableBodyHeight) + 'px';
              
            }
            
          }
          
                if (this.sidebar) {
        var contentAreaHeight = this.sidebar.nativeElement.offsetParent.offsetParent.offsetParent.clientHeight,
          height = contentAreaHeight - storeControlsHeight;
          height = height - 70;
        
        this.sidebar.nativeElement.style.maxHeight = (height) + 'px';
        this.sidebar.nativeElement.style.height = (height) + 'px';
      }

          
          
        }
        
        ngDoCheck() {
          this.adjustTableHeight();
        }
        
        selectEditor(editorId) {
          
          this.trackListFilters.editors = [editorId];
          this.selectedEditor = editorId;
          this.filterTrackList();
          
        }
        
        
        filterTrackList($event?) {
          
          $event = $event || {};
          
          this.showingTopTracks = false;
          
          if($event && $event.sortField) {
            
            this.trackListFilters.sortField = $event.sortField;
            this.trackListFilters.sortOrder = $event.sortOrder;
            
          }
          
          if($event && $event.rows) {
            
            this.trackListFilters.rows = $event.rows;
            
            if($event.first != 0) {
              
              this.trackListFilters.currentPage = 1 + ($event.first / this.trackListFilters.rows);
              
            } else {
              
              this.trackListFilters.currentPage = 1
              
            }
            
          }
          
          if(this.selectedCurrencyId) {
            this._state.notifyDataChanged('spinner.show', {});

            this.tracks.list = [];
            if(this.activeTab != 'download-queue' && this.activeTab != 'library') {
              
              this.tracks.getTracks(this.selectedCurrencyId, this.trackListFilters, this.trackListFilters.currentPage).subscribe( (res) => {
                
                this.tracks.isUpdating = false;
                this.tracks.currentPage = res.Tracks.currentPage;
                this.tracks.totalPages = res.Tracks.totalPages;
                this.tracks.totalRecords = res.Tracks.total;
                this.tracks.list = res.Tracks.results;
                this._state.notifyDataChanged('spinner.hide', {});
                this._state.notifyDataChanged('spinner.show', {});
                
                this.account.getDownloadQueueForCurrency(this.selectedCurrencyId, this.trackListFilters).subscribe( (data) => {
                  
                  this.downloadQueue = data.DownloadQueue;
                  this.removeAddToDownloadQueueButtonIfTrackAlreadyAdded();
                  this.dataLoading = false;
                  this._state.notifyDataChanged('spinner.hide', {});
                  
                });
                
              });
              
            }
            
            if(this.activeTab == 'download-queue') {
              this.tracks.list = [];
              this._state.notifyDataChanged('spinner.show', {});
              
              this.account.getDownloadQueueForCurrency(this.selectedCurrencyId, this.trackListFilters).subscribe( (data) => {
                
                this.tracks.currentPage = 1;
                this.tracks.totalPages = 1;
                this.tracks.totalRecords = data.DownloadQueue.tracks.length;
                this.tracks.list = data.DownloadQueue.tracks;
                this.tracksSelected = [];
                this.removeAddToDownloadQueueButtonIfTrackAlreadyAdded();
                this._state.notifyDataChanged('spinner.hide', {});
                
              });              
              
            }
            
            if(this.activeTab == 'library') {
              
              this._state.notifyDataChanged('library.retrieve', {});
              
            }
            
            if(this.activeTab == 'transactions') {
              
              this.account.getTransactionHistory().subscribe( (res) => {
                
                this.transactions = res.Transactions;
                
              })
              
            }
            
            
          }
          
        }
        
        purchaseAndDownloadSelectedTracks(download?:boolean) {
          
          var tasks = [];
          
          var unpurchasedTrackCount = 0;
          
          var purchasedTrackCount = 0;
          
          for( var i = 0; i < this.tracksSelected.length; i++) {
            
            if(this.selectedCurrency.purchasedTracks.indexOf(this.tracksSelected[i]._id) === -1) {
              
              unpurchasedTrackCount++;
              
            } else {
              
              purchasedTrackCount++;
              
            }
            
          }
            
            if(confirm('You are about to commit ' + unpurchasedTrackCount + ' new track(s) to your library at a cost of ' + unpurchasedTrackCount + ' credits. Do you wish to spend these credits? Any previously committed tracks will not be charged twice.')) {
              
              async.eachSeries(this.tracksSelected, (track, callback) => {
                
                this.bulkDownloadTrack(track, download, callback);
                
              }, (err) => {
                
                if(err) console.log(err);
                console.log('completed process');
                this.getDownloadQueueForCurrency([]);

              })
              
            }
            
            //this.bulkDownloadTrack(this.tracksSelected[i], download);

          
        }
        
        downloadTrackRequest(track, autoDownload?:boolean, callback?:any) {
          
          return this.downloadTrackSetup(track).subscribe( (downloadResponse) => {
            console.log(downloadResponse);
            if(downloadResponse.err) {
              
              if(downloadResponse.err && downloadResponse.err == 'insufficient-credits') {
                
                this.insufficientCredits = true;
                
                this.currency.getPackages().subscribe( (res) => {
                  this.currencyPackages = res.Packages;
                  this.packagePurchaseModal.show();
                  
                });
                
                
              }
              
            } else {
              
              if(downloadResponse.status && downloadResponse.status == 'already-purchased') {
                
              /*  this._state.notifyDataChanged('growlNotifications.update', {
                  severity:'info',
                  summary:'Track already purchased.',
                  detail: 'No credit ded'}
                );
                */
                this._state.notifyDataChanged('download.purchase', { });
                
              } else if(downloadResponse.creditsDeducted) {
                
                this.selectedCurrencyCreditBalance = downloadResponse.creditBalance;
                
                this._state.notifyDataChanged('growlNotifications.update', {
                  severity:'info',
                  summary:'Track purchased and ' + downloadResponse.creditsDeducted + ' credit has been deducted from your balance.',
                  detail: ''}
                );
                
                this._state.notifyDataChanged('download.purchase', { });
                
              } else if(downloadResponse.creditBalance == -1) {

                this._state.notifyDataChanged('growlNotifications.update', {
                  severity:'info',
                  summary:'Track purchased.',
                  detail: ''}
                );
                
                this._state.notifyDataChanged('download.purchase', { });
                
              }
              
              if(autoDownload) {
                
                let body = JSON.stringify({ downloadId: downloadResponse.download, trackId: downloadResponse.track[0] });
                let headers = new Headers({ 'Content-Type': 'application/json' });
                let options = new RequestOptions({ headers: headers });
                
                this.http.post('/api/v1/members/download/get', body, options).map( (res) => res.json() ).catch(this.handleError)
                .subscribe( (response) => {

                  var a = document.createElement("a");
                  a.setAttribute('style', 'display:none;');
                  a.href = response.url;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  
                this._state.notifyDataChanged('growlNotifications.update', {
                  severity:'info',
                  summary:'Downloading track.',
                  detail: ''}
                );
                  
                  if(callback) {
                                      callback();

                  }

                }, (err) => {
                  console.log('error on download url request', err);
                });
                
              } else {
                
                  if(callback) {
                                      callback();

                  }                
              }
              
            }
            
          });
          
          
        }
        
         handleError (error: Response | any) {
    // In a real world app, you might use a remote logging infrastructure
    let errMsg: string;
    if (error instanceof Response) {
      const body = error.json() || '';
      const err = body.error || JSON.stringify(body);
      errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    console.error(errMsg);
    return Observable.throw(errMsg);
  }


        
        downloadTrack(track, autoDownload?:boolean) {
          
          if(this.selectedCurrency.purchasedTracks.indexOf(track._id) === -1 && this.selectedCurrencyCreditBalance !== -1) {
            if(confirm('Do you wish to purchase this track at the cost of 1 credit?')) {
              this.downloadTrackRequest(track, autoDownload);
            }
          } else {
            
            this.downloadTrackRequest(track, autoDownload);
            
            
          }
          
          
        }
        
          bulkDownloadTrack(track, autoDownload?:boolean, callback?:any) {

            this.downloadTrackRequest(track, autoDownload, callback);
            
        }

        
        addCollectionToMyCrates(collectionId) {
          
          this.currency.addCollectionToMyCrates(collectionId).subscribe( (res) => {
            
            this.currency.getCrates(this.selectedCurrencyId).subscribe( (res) => {
              
              this.crates = res.Crates.map( (collection) => {
                
                if(collection.type == 'collection') {
                  
                  collection.description = collection.editorOwner.stageName + '\r\n\r\n\r\n' + collection.description;
                }
                
                return collection;
                
            });
              
              this._state.notifyDataChanged('growlNotifications.update', {
                severity:'info',
                summary:'Saved Collection to Crates',
                detail: ''}
              );
              
            });
            
            
          });
          
        }
        
        loadCollection(collectionId) {
          this._state.notifyDataChanged('spinner.show', {});
          this.trackListFilters.currentPage = this.trackListFilters.currentPage || 1;
          this.currency.getCollection(this.selectedCurrencyId, collectionId, this.trackListFilters.rows, this.trackListFilters.currentPage).subscribe( (res) => {
            
            this.showingTopTracks = true;
            this.tracks.currentPage = parseInt(res.Collection.currentPage) || 1;
            this.tracks.totalPages = res.Collection.totalPages;
            this.trackListFilters.currentPage = 1;
            this.showFilters = false;
            this.tracks.totalRecords = res.Collection.tracks.length;
            this.tracks.list = res.Collection.tracks;
            this.selectedCollectionId = collectionId;
            this._state.notifyDataChanged('spinner.hide', {});
            
          });
          
        }
        
        downloadTrackSetup(track?) {
          
          var tracksToPurchaseAndDownload;
          
          if(track) {
            
            tracksToPurchaseAndDownload = [track];
            
          } else {
            
            tracksToPurchaseAndDownload = this.tracksToPurchase;
            
          }
          
          let body = JSON.stringify(tracksToPurchaseAndDownload);
          let headers = new Headers({ 'Content-Type': 'application/json' });
          let options = new RequestOptions({ headers: headers });
          
          return this.http.post('/api/v1/members/currency/' + this.selectedCurrencyId + '/purchase', body, options)
          .map((downloadResponse) => downloadResponse.json())
          
        }
        
        packagePurchaseModalShow() {
          
          
          this.currency.getPackages().subscribe( (res) => {
            
            this.currencyPackages = res.Packages;
            this.packagePurchaseModal.show();
            
          });
          
        }
        
        purchaseCreditPackage(creditPackage,$event) {
          
          
          
          let body = JSON.stringify({  });
          
          let headers = new Headers({ 'Content-Type': 'application/json' });
          let options = new RequestOptions({ headers: headers });
          
          this.http.post('/api/v1/members/package/' + this.selectedPackageId + '/purchase', body, options)
          .map((purchaseResponse) => purchaseResponse.json())
          .subscribe( (purchaseResponse) => {
            console.log(purchaseResponse);
            if(purchaseResponse.err) {
              
            } else {
              
              
              
            }
            
          });
          
        }
        
        
        
        /* For testing purposes only */
        /* downloadTrack(track) {
        this.http.get(track.lowBitRateFile.url).subscribe( (file) => {
        var splitfilename = file.url.split('/');
        var filenameToSaveAs = splitfilename[splitfilename.length-1];
        //console.log(splitfilename, filenameToSaveAs);
        var blob = new Blob([file], {type: 'application/octet-stream'});
        saveAs(blob,filenameToSaveAs);
        
      });
      */
      
      selectAllTracks() {
      
        if(this.tracksSelected.length == this.tracks.list.length) {
          this.tracksSelected = [];
        } else {
                  this.tracksSelected = this.tracks.list;

        }
        
      }
      
      togglePlayPause (track) {
        
        var trackPlayerData = {
          name: track.name  || '[title not set]',
          version: track.version || '[version not set]',
          artistPrimaryName: track.artistPrimaryName  || '[artist not set]',
          artistsFeaturedPrimaryName: track.artistsFeaturedPrimaryName,
          _id: track._id,
          url: track.publishedLowBitRateFile.url,
          waveformUrl: track.waveformImageSnippetFileUrl,
          fileType: track.fileType
        }
        
        this._state.notifyDataChanged('player.toggle', trackPlayerData);
        
      }
      
      hideModal() {
        this.packagePurchaseModal.hide();
      }
      
      onDeleteConfirm(event): void {
        if (window.confirm('Are you sure you want to delete?')) {
          event.confirm.resolve();
        } else {
          event.confirm.reject();
        }
      }
      
      getDownloadQueueForCurrency(queueList) {
        
        this.account.getDownloadQueueForCurrency(this.selectedCurrencyId, this.trackListFilters).subscribe( (data) => {
          
          this.downloadQueue = data.DownloadQueue;
          this.removeAddToDownloadQueueButtonIfTrackAlreadyAdded();
          if(this.activeTab == 'download-queue') {
            
            this.tracks.list = data.DownloadQueue.tracks;
            
          }
          
        });
        
      }
      
      removeAddToDownloadQueueButtonIfTrackAlreadyAdded() {
        
        if(this.downloadQueue && this.downloadQueue.tracks) {
          
          var tracksInDownloadQueue = [];
          
          for(var i = 0; i < this.downloadQueue.tracks.length; i++) {
            
            var currentTrack = this.downloadQueue.tracks[i];
            
            tracksInDownloadQueue.push(currentTrack._id);
            
            
            if(currentTrack.tracksInSameReleases) {
              var currentTrackAffiliatedTracks = currentTrack.tracksInSameReleases;
              tracksInDownloadQueue = tracksInDownloadQueue.concat(currentTrackAffiliatedTracks.map( (affiliatedTrack) => {
                
                return affiliatedTrack._id;
                
              }));
              
              
            }
            
            
          }
          
          if(this.tracks && this.tracks.list && this.tracks.list.length > 0) {
            
            this.tracks.list = this.tracks.list.map( (track) => {
              
              if(tracksInDownloadQueue.indexOf(track._id) !== -1) {
                
                track.addedToDownloadQueue = true;
                return track;
                
              } else {
                track.addedToDownloadQueue = false;
                return track;
              }
              
            });
            
            
          }
          
          
        }
        
      }
      
      removeTrackFromDownloadQueue(track) {
        
        this._state.notifyDataChanged('spinner.show', {});
        
        this.account.removeTrackFromDownloadQueueForCurrency(track,this.selectedCurrencyId).subscribe( (data) => {
          
          if(this.activeTab == 'download-queue') {
            
            this.tracks.list = data.DownloadQueue.tracks;
            
          } else {
            
            for (var i = 0; i < data.DownloadQueue.tracks.length; i++) {
              
              var removedTrackIndex = this.tracks.list.findIndex( (item) => {
                
                  var release = (item.releases && item.releases.length > 0) ? item.releases[0] : false 
            
            if(release) {
              
              return item._id == track._id || item.releases.indexOf(release) !== -1;
              
            } else {
              
              return item._id == track._id;
              
            }

                
              });
              
              this.tracks.list[removedTrackIndex].addedToDownloadQueue = false;
              
            }
            
          }
          
                                this._state.notifyDataChanged('growlNotifications.update', {
              severity:'info',
              summary:'Track Removed frome Download Queue',
              detail: track.formattedName}
            );

          
          this._state.notifyDataChanged('spinner.hide', {});
          
        });
        
      }
      
      addTrackToDownloadQueue(track) {
        
        this._state.notifyDataChanged('spinner.show', {});
        
        
        this.account.addTrackToDownloadQueueForCurrency(track,this.selectedCurrencyId).subscribe( (data) => {
            
            var release = (track.releases && track.releases.length > 0) ? track.releases[0] : false 

              var addedTracks = this.tracks.list.filter( (item) => {
                
            if(release) {
              
              return item._id == track._id || item.releases.indexOf(release) !== -1;
              
            } else {
              
              return item._id == track._id;
              
            }

                
          });
          
          console.log(addedTracks);
          
          for(var i = 0; i < addedTracks.length; i++) {
            
                          addedTracks[i].addedToDownloadQueue = true;

            
          }
          
                      this._state.notifyDataChanged('growlNotifications.update', {
              severity:'info',
              summary:'Track Added to Download Queue',
              detail: track.formattedName}
            );

              

          
          this._state.notifyDataChanged('spinner.hide', {});
          
          
        });
        
      }
      
      createCrate(saveAsNewCopy?:boolean) {
        var crate = Object.assign({}, this.trackListFilters);

        
        
        
        this.currentlyAppliedCrate = Object.assign({}, this.currentlyAppliedCrate, this.trackListFilters, crate);
        
        if(saveAsNewCopy) {
          delete this.currentlyAppliedCrate._id;
        }
        
        this.currency.createCrate(this.selectedCurrencyId,this.currentlyAppliedCrate).subscribe( (res) => {
          
          this.trackListFilters._id = res.Crate._id;
          
          this.currency.getCrates(this.selectedCurrencyId).subscribe( (res) => {
            
            this.crates = res.Crates.map( (collection) => {
                if(collection.type == 'collection') {
                  
                  collection.description = collection.editorOwner.stageName + '\r\n\r\n\r\n' + collection.description;
                }
              return collection;
            });
            
            this._state.notifyDataChanged('growlNotifications.update', {
              severity:'info',
              summary:'New crate saved',
              detail: ''}
            );
            
          });
          
        });
        
        
      }
      
      updateCrate() {
        
        
        this.currency.saveCrate(this.selectedCurrencyId, this.trackListFilters).subscribe( (res) => {
          
          this.trackListFilters = Object.assign(this.trackListFilters, res.Crate);
          
          this.currency.getCrates(this.selectedCurrencyId).subscribe( (res) => {
            
            this.crates = res.Crates.map( (collection) => {
                if(collection.type == 'collection') {
                  
                  collection.description = collection.editorOwner.stageName + '\r\n\r\n\r\n' + collection.description;
                }
              return collection;
            });
            this._state.notifyDataChanged('growlNotifications.update', {
              severity:'info',
              summary:'Crate updated',
              
              detail: ''});
              
              
              
            });
            
            
          });
          
        }
        
        applyCrate(crate) {
          
          
          if(crate.type == 'crate') {
            this._state.notifyDataChanged('spinner.show', {});

            this.selectedCollectionId = crate._id;

            this.currency.getCrate(this.selectedCurrencyId, crate._id).subscribe( (res) => {
              

              this.trackListFilters = Object.assign({}, this.trackListFilters, res.Crate, {currentPage: 1});

              this.filterTrackList();

              this._state.notifyDataChanged('growlNotifications.update', {
                
                severity:'info',
                summary:'Crate applied',
                detail: ''});
                
              });
              
            } else {
              this._state.notifyDataChanged('spinner.show', {});
              
              this.currency.getCollection(this.selectedCurrencyId, crate._id).subscribe( (res) => {
                this.selectedCollectionId = crate._id;
                
                this.tracks.currentPage = 1;
                this.tracks.totalPages = 1;
                this.tracks.totalRecords = res.Collection.tracks.length;
                this.tracks.list = res.Collection.tracks;
                this.trackListFilters = Object.assign(this.trackListFilters, res.Collection, {currentPage: 1});
                this._state.notifyDataChanged('spinner.hide', {});
                
                this._state.notifyDataChanged('growlNotifications.update', {
                  
                  severity:'info',
                  summary:'Crate applied',
                  detail: ''});
                  
                });
                
                
              }
              
            }
            
            
            
            removeCrate(crate) {
              
              if(crate.type == 'crate') {
                
                this._state.notifyDataChanged('spinner.show', {});
                
                this.currency.removeCrate(this.selectedCurrencyId, crate._id).subscribe( (res) => {
                  
                  if( this.trackListFilters._id && this.trackListFilters._id == crate._id ) {
                    
                    this.clearCurrentCrate();
                    
                  }
                  this._state.notifyDataChanged('spinner.show', {});
                  
                  this.currency.getCrates(this.selectedCurrencyId).subscribe( (res) => {
                    
                    this.crates = res.Crates.map( (collection) => {
                if(collection.type == 'collection') {
                  
                  collection.description = collection.editorOwner.stageName + '\r\n\r\n\r\n' + collection.description;
                }
              return collection;
            });
            
                    this._state.notifyDataChanged('spinner.hide', {});
                    
                    this._state.notifyDataChanged('growlNotifications.update', {
                      
                      severity:'info',
                      summary:'Crate removed',
                      detail: ''
                      
                    });
                    
                  });
                });
              } else {
                
                this._state.notifyDataChanged('spinner.show', {});
                
                this.currency.removeCollectionFromMyCrates(crate._id).subscribe( (res) => {
                  
                  this.currency.getCrates(this.selectedCurrencyId).subscribe( (res) => {
                    this.crates = res.Crates.map( (collection) => {
                if(collection.type == 'collection') {
                  
                  collection.description = collection.editorOwner.stageName + '\r\n\r\n\r\n' + collection.description;
                }
              return collection;
            });
                    
                    this.trackListFilters = Object.assign(this.trackListFilters, res.Crate);
                    //this.filterTrackList();
                    
                    this._state.notifyDataChanged('growlNotifications.update', {
                      severity:'info',
                      summary:'Collection removed',
                      detail: ''});
                      
                                      this._state.notifyDataChanged('spinner.hide', {});

                      
                    });
                    
                  });
                  
                  
                  
                }
              }
              
              isTrackColumnSelected(column) {
                
                return this.trackColumnsSelected.indexOf(column) !== -1;
                
              }
              
              getCrates() {
                
                
                this.currency.getCrates(this.selectedCurrencyId).subscribe( (res) => {
                  
                  this.trackListFilters = Object.assign(this.trackListFilters, res.Crate);
                  this.filterTrackList();
                  
                  this._state.notifyDataChanged('growlNotifications.update', {
                    severity:'info',
                    summary:'Crate applied',
                    detail: ''});
                    
                  });
                  
                  
                  
                }
                
                
                clearCurrentCrate() {
                  
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
                    sortField: 'publishDate',
                    sortOrder: -1,
                    rows: 50,
                    _id: null,
                    textSearchField: null,
                    name: null
                  };
                  
                  this.selectedCollectionId = null;
                  this.selectedEditor = null;
                  this.filterTrackList();
                  
                  
                }
                
                toggleFilterPanel() {
                  
                  this.showFilters = !this.showFilters;
                  
                }
                
                applyCurrencyHoverColor($event) {

                  $event.target.style.borderLeftColor = this.currency.selectedCurrency.color;
                  
                }
                
                removeCurrencyHoverColor($event, chartSortField) {

                  if(chartSortField != this.trackListFilters.sortField) {
                    
                    $event.target.style.borderLeftColor = 'transparent';
                    
                  } 
                  
                }
                
                removeCurrencyHoverColorEditor($event, editorId) {
                  
                  if(editorId != this.selectedEditor) {
                    
                    $event.target.style.borderLeftColor = 'transparent';

                  }
                  
                }
                
              }
