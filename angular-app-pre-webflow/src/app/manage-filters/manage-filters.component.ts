import {Component, Injectable, Input, Output, EventEmitter} from '@angular/core';
import {AppState} from '../app.service';
import {Genres} from '../genres/genres.service';
import {Keys} from '../keys/keys.service';
import {Tags} from '../tags/tags.service';
import {Currency} from '../currency/currency.service';
import {CurrencyEditors} from '../currencyEditors/currencyEditors.service';
import {CurrencyCollections} from '../currencyCollections/currencyCollections.service';
import {Tracks} from '../tracks/tracks.service';
import {Http, Headers} from '@angular/http';
import {Rule} from '../ruleClass/rule.class';

@Component({
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'manage-filters',  // <home></home>
  // We need to tell Angular's Dependency Injection which providers are in our app.
  providers: [ Currency, Genres, Keys, CurrencyEditors,CurrencyCollections, Tracks, Tags,
  ],
  // We need to tell Angular's compiler which directives are in our template.
  // Doing so will allow Angular to attach our behavior to an element
  directives: [
  ],
  // We need to tell Angular's compiler which custom pipes are in our template.
  pipes: [  ],
  // Our list of styles in our component. We may add more to compose many styles together
  styles: [ require('../manage-filters/manage-filters.css') ],
  // Every Angular template is first compiled by the browser before Angular runs it's compiler
  template: require('../manage-filters/manage-filters.html')
})
export class ManageFilters {
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
  rules:Array<Rule> = [];

  availableCriteria:Array<any> = [
    {
      label: 'Genre',
      key: 'genres',
      type: 'text'
   },
   {
     label: 'Keys',
     key: 'keys',
     type: 'text'
  }
 ];

   constructor(  public genres: Genres,
                 public keys: Keys,
                 public currencyEditors: CurrencyEditors,
                 public currencyCollections: CurrencyCollections,
                 public tracks: Tracks,
                 public tags: Tags,
                 public appState: AppState
                 ) {
                  //this.rules.push({options:null ,type:'',operator:'',value:''});


   }

   ngOnAfterInit() {

     this.currencyEditors.getCurrencyEditors(this.appState.get('currentCurrencyViewing'));
     this.currencyCollections.getCurrencyCollections(this.appState.get('currentCurrencyViewing'));

   }

   updateTracks(rules) {

     console.log(rules);
     var filters = { mainGenres: ['57276705129b328835649d1a']};
     this.tracks.getTracks(this.appState.get('currentCurrencyViewing'),filters);

   }

   testModal (form) {
     console.log(form,this);
     alert('this was fired');
   }

   setType(value,index) {
     this.rules[index].type = value;
     this.rules[index].options = this[value].list;
     console.log(this.rules);
   }

   setValue(value,index) {
     this.rules[index].value = value;
     console.log(this.rules);
   }

  /* setFilters($event,type,id) {
     var addToFilter = $event.target.checked;
     this.selectedCurrency = this.localState.currencyId;

     if(type == 'minYear') {
       this.minYear = id;
     }

     if(type == 'maxYear') {
       this.maxYear = id;
     }

     if(type == 'startBpm') {
       this.startBpm = id;
     }

     if(type == 'endBpm') {
       this.endBpm = id;
     }

     if(addToFilter == true) {
       switch(type) {
         case "mainGenre": {
           this.selectedMainGenres.push(id);
           break;
         }
         case "collection": {
           this.selectedCollections.push(id);
           break;
         }
         case "key": {
           this.selectedKeys.push(id);
           break;
         }
         case "editor": {
           this.selectedEditors.push(id);
           break;
         }
         case "tag": {
           this.selectedTags.push(id);
           break;
         }
       }
     }

     if(addToFilter == false) {
       switch(type) {
         case "mainGenre": {
           for(var i = this.selectedMainGenres.length; i--;){
            if (this.selectedMainGenres[i] === id) this.selectedMainGenres.splice(i, 1);
           }
           break;
         }
         case "collection": {
           for(var i = this.selectedCollections.length; i--;){
             if (this.selectedCollections[i] === id) this.selectedCollections.splice(i, 1);
           }
           break;

         }
         case "key": {
           for(var i = this.selectedKeys.length; i--;){
             if (this.selectedKeys[i] === id) this.selectedKeys.splice(i, 1);
           }
           break;
         }

         case "editor": {
           for(var i = this.selectedEditors.length; i--;){
             if (this.selectedEditors[i] === id) this.selectedEditors.splice(i, 1);
           }
           break;
         }
         case "tag": {
           for(var i = this.selectedTags.length; i--;){
             if (this.selectedTags[i] === id) this.selectedTags.splice(i, 1);
           }
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
       minYear: this.minYear,
       maxYear: this.maxYear,
       startBpm: this.startBpm,
       endBpm: this.endBpm

     };

     this.tracks.getTracks(this.localState.currencyId,filters);
    this.selectedMainGenres
     this.selectedCollections:Array<String>;
     this.startBpm:number;
     this.endBpm:number;
     this.startYear:number;
     this.endYear:number;
     this.selectedKeys:Array<String>;
     this.selectedEditors:Array<String>;

   }*/

   addNewRule($event) {
     $event.preventDefault();
    // this.rules.push({type:'',operator:'',value:'', options: null});
   }

   removeRule($event,i) {
     $event.preventDefault();
     this.rules.splice(i,1);
   }

}
