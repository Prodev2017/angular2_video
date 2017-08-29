import { Component, Input } from '@angular/core';
import { Router, ActivatedRoute, RouterLinkActive, NavigationEnd } from '@angular/router';
import { AuthService, Currency } from '../../services';
import { GlobalState } from '../../../global.state';

@Component({
  selector: 'store-selector',
  template: require('./storeSelector.html'),
})
export class StoreSelector {

  @Input() public editorUploader:boolean = false;

  currencyList:Array<any> = [];
  selectedCurrency:any;

  constructor(public router: Router, public currency:Currency, public _state:GlobalState, private route: ActivatedRoute, public authService:AuthService) {

    this.currencyList = this.currency.currenciesWithEnabledStatuses;

  }

  ngOnInit() {

    this.currencyList = this.currency.getCurrencyLinks(this.editorUploader);
    this.selectedCurrency = this.currency.selectedCurrency;
    this.setCurrencyColor(this.selectedCurrency);
  }

  ngAfterViewInit() {


  }

  setCurrencyColor(currency) {

    let storeStyleEl = document.querySelector('#store-style');
    if (!storeStyleEl) {
      storeStyleEl = document.createElement('style');
      storeStyleEl.id = 'store-style';
      document.body.appendChild(storeStyleEl);
    }

    storeStyleEl.innerHTML = `body {
      --currency-color: ${currency.color};
    }`;
  }

  selectStore(currency) {
    if(currency.enabled) {

      var currencyFromList = this.currency.list.find( (item) => {
        return item._id == currency._id;
      })

      this.currency.selectedCurrency = currencyFromList;
      this.selectedCurrency = currencyFromList;
      this.setCurrencyColor(currency);
      this._state.notifyDataChanged('currency.changed', currencyFromList);

    }
  }

  ngOnDestroy() {
  }

  setStoreActivity(url) {
  }

  changeBackgroundOnHover(color, event) {

    event.target.style.backgroundColor = color;

  }

}
