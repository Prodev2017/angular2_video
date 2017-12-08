import {Component, ViewEncapsulation, Input, Output, EventEmitter} from '@angular/core';
import {Router, Routes, NavigationEnd, ActivatedRoute, Params} from '@angular/router';
import {Subscription} from 'rxjs/Rx';

import {BaMenuService} from './baMenu.service';
import {GlobalState} from '../../../global.state';
import {AppState} from '../../../app.service';
import {Currency, EditorService, AuthService} from '../../../theme/services';
import * as _ from 'lodash';

@Component({
  selector: 'ba-menu',
  encapsulation: ViewEncapsulation.None,
  styles: [require('./baMenu.scss')],
  template: require('./baMenu.html'),
  providers: [BaMenuService]
})
export class BaMenu {
  
  @Input() menuRoutes:Routes = [];
  @Input() sidebarCollapsed:boolean = false;
  @Input() menuHeight:number;
  
  @Output() expandMenu = new EventEmitter<any>();
  
  public menuItems:any[];
  public showHoverElem:boolean;
  public hoverElemHeight:number;
  public hoverElemTop:number;
  protected _onRouteChange:Subscription;
  public outOfArea:number = -200;
  public preservedMenuRoutes:Routes = [];
  
  constructor(private _router:Router, private _service:BaMenuService, private _state:GlobalState,
    public currency:Currency, public editors:EditorService, private route: ActivatedRoute,
    public appState:AppState, public authService:AuthService) {
      
      this._onRouteChange = this._router.events.subscribe((event) => {
        
        
        if (event instanceof NavigationEnd) {
          console.log('nav end triggered');
          var previousModule;
          var currentModule;
          
          var previousUrl = this.appState.get('currentUrl');
          var currentUrl = this.appState.set('currentUrl', event.url);
          
          if(previousUrl) {
            var previousUrlSegments = previousUrl.split('/');
            
          }
          
          if(currentUrl) {
            var currentUrlSegments = currentUrl.split('/');
            
          }
          
          if(previousUrlSegments && previousUrlSegments.length > 0)
          {
            previousModule = previousUrlSegments[2];
          }
          
          if(currentUrlSegments && currentUrlSegments.length > 0)
          {
            currentModule = currentUrlSegments[2];
          }
          
          console.log('previous and current module', previousModule, currentModule);
          if(previousModule != currentModule) {
            console.log(event);
            if(this.authService.authResponse.profileData.userRole == 'editor') {
              
              var enabledCurrencies = this.getEditorEnabledCurrencies();
              if( (this.currency.selectedCurrency == null || enabledCurrencies.indexOf(this.currency.selectedCurrency) === -1) && ( event.url == '/pages/editors/uploader' || event.url == '/pages/editors/tracks') ) {
                console.log('editor uploader and no currency selected')
                this.selectEditorDefaultCurrencyOnLoad();  
                
              } 
              
              
            } 
            
            if( this.currency.selectedCurrency == null ) {
              console.log(' no currency selected');
              var enabledCurrencies = this.currency.list.filter( (currency) => {
                return currency.enabled;
              });
              this.currency.selectedCurrency = enabledCurrencies[0];  
              this._state.notifyDataChanged('currency.changed', this.currency.selectedCurrency);
              
            } else {
              
              this._state.notifyDataChanged('currency.changed', this.currency.selectedCurrency);
              
            }
            
            
            if (this.menuItems) {
              this.selectMenuAndNotify();
            } else {
              // on page load we have to wait as event is fired before menu elements are prepared
              setTimeout(() => this.selectMenuAndNotify());
            }
          }
        }
      });
      
    }
    
    public selectMenuAndNotify():void {
      if (this.menuItems) {
        this.menuItems = this._service.selectMenuItem(this.menuItems);
        console.log('the current menu items', this.menuItems);
        this._state.notifyDataChanged('menu.activeLink', this._service.getCurrentItem());
      }
    }
    
    public setupCurrencyLinks():void {
      var currencyOptions = this.currency.getCurrencyLinks(this.authService.authResponse.profileData);
      for(var i = 0; i < this.menuRoutes[0].children.length; i++) {
        
        if(this.menuRoutes[0].children[i].path == 'service-selector') {
          
          this.menuRoutes[0].children[i].children = currencyOptions;
          
        }
        
      }
      
      this.menuItems = this._service.convertRoutesToMenus(this.menuRoutes);
      
    }
    
    public getEditorEnabledCurrencies () {
      
      var currentUrl = this.appState.get('currentUrl');
      var enabledCurrencies = this.currency.list.filter( (currency) => {
        return currency.enabled && ((this.authService.authResponse.profileData.currencies.indexOf(currency._id) !== -1 && (currentUrl == '/pages/editors/uploader' || currentUrl == '/pages/editors/tracks')) || currentUrl != '/pages/editors/uploader' || currentUrl != '/pages/editors/tracks');
      });
      console.log('enabled currencies while setting up links', enabledCurrencies, currentUrl);
      
      return enabledCurrencies;
      
    }
    
    public selectEditorDefaultCurrencyOnLoad() {

      var enabledCurrencies = this.getEditorEnabledCurrencies();
      this.currency.selectedCurrency =  enabledCurrencies[0];

    }
    
    public setupEditorLinks(currencyId):void {
      
      this.editors.getCurrencyEditors(currencyId).subscribe((res) => {
        
        this.editors.list = res.CurrencyEditors;
        
        for(var i = 0; i < this.menuRoutes[0].children.length; i++) {
          
          if(this.menuRoutes[0].children[i].path == 'top-editors') {
            
            var currencyEditorLinks = this.editors.getCurrencyEditorLinks();
            
            this.menuRoutes[0].children[i].children = currencyEditorLinks;
            
          }
          
        }
        
        this.menuItems = this._service.convertRoutesToMenus(this.menuRoutes);
        
      });
      
    }
    
    public ngOnInit():void {
      
      this.menuRoutes = _.cloneDeep(this.menuRoutes);
      this.setupCurrencyLinks();
      
      this.menuItems = this._service.convertRoutesToMenus(this.menuRoutes);
      
      
      this._state.subscribe('download.purchase', (data) => {
        
        this.currency.getCurrencies().subscribe((res) => {
          
          this.currency.list = res.Currencies;
          this.setupCurrencyLinks();
          
        });
        
      });
      
      this._state.subscribe('credits.purchase', (data) => {
        
        this.currency.getCurrencies().subscribe((res) => {
          
          this.currency.list = res.Currencies;
          this.setupCurrencyLinks();
          
        });
        
      });
      
      this._state.subscribe('currency.changed', (data) => {
        
        var currencyId = data._id;
        
        var changedCurrencyIndex = this.currency.list.findIndex( (item) => {
          
          return item._id.toString() == currencyId.toString();
          
        });
        
        this.currency.list[changedCurrencyIndex] = data;
        
        
        if(this.currency.list.length > 0) {
          this.setupCurrencyLinks();
          
          //this.setupEditorLinks(currencyId);
        }
        
      });
      
    }
    
    public ngOnDestroy():void {
      this._onRouteChange.unsubscribe();
    }
    
    public hoverItem($event):void {
      this.showHoverElem = true;
      this.hoverElemHeight = $event.currentTarget.clientHeight;
      // TODO: get rid of magic 66 constant
      this.hoverElemTop = $event.currentTarget.getBoundingClientRect().top - 130;
    }
    
    public toggleSubMenu($event):boolean {
      var submenu = jQuery($event.currentTarget).next();
      
      if (this.sidebarCollapsed) {
        this.expandMenu.emit(null);
        if (!$event.item.expanded) {
          $event.item.expanded = true;
        }
      } else {
        $event.item.expanded = !$event.item.expanded;
        this.expandMenu.emit(null);
        submenu.slideToggle();
      }
      
      return false;
    }
  }
