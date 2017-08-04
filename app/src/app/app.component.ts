import './app.loader.ts';
import { Component, ViewEncapsulation, ViewContainerRef } from '@angular/core';
import { GlobalState } from './global.state';
import { BaImageLoaderService, BaThemePreloader, BaThemeSpinner } from './theme/services';
import { layoutPaths } from './theme/theme.constants';
import { Message } from 'primeng/primeng';
import { Currency } from './theme/services';

/*
 * App Component
 * Top Level Component
 */
@Component({
  selector: 'app',
  encapsulation: ViewEncapsulation.None,
  styles: [require('normalize.css'), require('tooltipster/dist/css/tooltipster.bundle.css'), require('./app.scss'), ],
  template: `
    <p-growl [life]="5000" [value]="growlNotifications"></p-growl>
    <main [ngClass]="{'menu-collapsed': isMenuCollapsed}" baThemeRun>
      <div class="additional-bg"></div>
      <router-outlet></router-outlet>
    </main>
  `
})
export class App {

  isMenuCollapsed: boolean = false;
  public growlNotifications:Message[] = [];
  viewContainerRef:any;
  constructor(private _state: GlobalState,
              private _imageLoader: BaImageLoaderService,
              private _spinner: BaThemeSpinner,
              public currency:Currency,
              viewContainerRef:ViewContainerRef) {

    this._state.subscribe('growlNotifications.update', (message) => {
      this.growlNotifications = [];
      this.growlNotifications.push(message);

    });

    this.viewContainerRef = viewContainerRef;
    this._loadImages();

    this._state.subscribe('menu.isCollapsed', (isCollapsed) => {
      this.isMenuCollapsed = isCollapsed;
    });
    
    this._state.subscribe('spinner.show', () => {
     
     this._spinner.show();
      
    });
    
        this._state.subscribe('spinner.hide', () => {
     
     this._spinner.hide();
      
    });

  }

  public ngAfterViewInit(): void {
    // hide spinner once all loaders are completed
    
      BaThemePreloader.load().then((values) => {
        
        this._state.notifyDataChanged('spinner.hide', {});

      });

  }

  private _loadImages(): void {
    // register some loaders
    //BaThemePreloader.registerLoader(this._imageLoader.load(layoutPaths.images.root + 'sky-bg.jpg'));
  }
}
