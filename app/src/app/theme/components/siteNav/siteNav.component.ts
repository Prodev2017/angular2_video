import { Component } from '@angular/core';
import { Router, ActivatedRoute, RouterLinkActive, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services';
import { GlobalState } from '../../../global.state';

@Component({
  selector: 'site-nav',
  template: require('./siteNav.html'),
})
export class SiteNav {
  navChangeEvent: any;
  isStoreActive: any;
  
  constructor(public router: Router, public _state:GlobalState, private route: ActivatedRoute, public authService:AuthService) {
    this.navChangeEvent = router.events
    .filter(event => event instanceof NavigationEnd)
    .subscribe(data => {
      this.setStoreActivity(data.url);
    });
  }
  
  ngOnDestroy() {
    this.navChangeEvent.unsubscribe();
  }
  
  setStoreActivity(url) {
    if (url.substr(1, 12) == 'pages/tracks') {
      this.isStoreActive = true;
    } else {
      this.isStoreActive = false;
    }
    this._state.notifyDataChanged('store.active', this.isStoreActive);
  }
}
