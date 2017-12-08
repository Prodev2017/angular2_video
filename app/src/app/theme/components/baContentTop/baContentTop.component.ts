import {Component} from '@angular/core';
import {GlobalState} from '../../../global.state';
import { Currency } from '../../services';
import {AppState} from '../../../app.service';
import {SelectItem, OverlayPanel, Button, ToggleButton, ContextMenu, MenuItem} from 'primeng/primeng';

@Component({
  selector: 'ba-content-top',
  styles: [require('./baContentTop.scss')],
  template: require('./baContentTop.html'),
})
export class BaContentTop {

  public activePageTitle:string = '';
  public selectedCurrency:string = '';
  public trackColumns:Array<any> = [];
  public trackColumnsSelected:any;
  public contextMenuItemsForTableColumns:any;
  public isMenuCollapsed:boolean = false;

  constructor(private _state:GlobalState, public appState:AppState, public currency:Currency) {

    this.trackColumnsSelected = {
      added: true,
      editor: true,
      artist: true,
      bpm: true,
      key: true,
      tags: true,
      genres: true,
      year: true,
      time: true
    };

    this.selectedCurrency = this.currency.selectedCurrency.name;
    this._state.subscribe('currency.changed', (currency) => {
      if (currency) {
        this.selectedCurrency = currency.name;
      }
    });

    this._state.subscribe('menu.activeLink', (activeLink) => {
      if (activeLink) {
        this.activePageTitle = activeLink.title;
      }
    });
  }

  public toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    this._state.notifyDataChanged('menu.isCollapsed', this.isMenuCollapsed);
  }

  updateSelectedColumns(event) {

    console.log(event);

    this._state.notifyDataChanged('trackList.columnsChanged',{selectedColumns: this.trackColumnsSelected});

  }

  startSearch() {

  }

  getMyLibrary() {

     this._state.notifyDataChanged('library.retrieve', {});

  }

  toggleCrateEditor() {

    this._state.notifyDataChanged('crateEditor.toggle', {});

  }

}
