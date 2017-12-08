import {Component, ViewEncapsulation, Input, Output, EventEmitter} from '@angular/core';
import {GlobalState} from '../../../../../global.state';
import {AppState} from '../../../../../app.service';
import { AuthService } from '../../../../services/auth';

import { Currency } from '../../../../services';

@Component({
  selector: 'ba-menu-item',
  encapsulation: ViewEncapsulation.None,
  styles: [require('./baMenuItem.scss')],
  template: require('./baMenuItem.html')
})
export class BaMenuItem {

  @Input() menuItem:any;
  @Input() child:boolean = false;

  @Output() itemHover = new EventEmitter<any>();
  @Output() toggleSubMenu = new EventEmitter<any>();
  
  currentActiveLink:any;

  constructor( public currency:Currency, public _state:GlobalState, public appState:AppState, public authService: AuthService) {}

  public onHoverItem($event):void {
    this.itemHover.emit($event);
  }

  public onSelectItem(item):void {

    if(item.route.type == "currency" && item.enabled) {
      
      this.currency.getCurrency(item.route.id).subscribe((res) => {

        this.currency.selectedCurrency =  res.Currency;

        this._state.notifyDataChanged('currency.changed',this.currency.selectedCurrency);
        
      });

    } else {
      
      //Nothing because it's disabled, duh!
      
    }


  }

  public onToggleSubMenu($event, item):boolean {
    $event.item = item;
    this.toggleSubMenu.emit($event);
    return false;
  }

}
