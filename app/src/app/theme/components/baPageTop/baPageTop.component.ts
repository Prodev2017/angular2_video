import {Component, ViewEncapsulation} from '@angular/core';
import { Router } from '@angular/router';
import {GlobalState} from '../../../global.state';

import { AuthService } from '../../services/auth';
import { Account } from '../../services';

import {WavesurferPlayer} from '../../components/wavesurferPlayer';
import { Message } from 'primeng/primeng';
import { IMAGES_ROOT, LOGO_PATH } from '../../';

@Component({
  selector: 'ba-page-top',
  styles: [require('./baPageTop.scss')],
  template: require('./baPageTop.html'),
  encapsulation: ViewEncapsulation.None
})
export class BaPageTop {

  public isScrolled:boolean = false;
  public isMenuCollapsed:boolean = false;
  public logoUrl:string = IMAGES_ROOT + LOGO_PATH;
  public profileUrl:string = '/assets/img/user-default.png';
  profile:any = {userRole:''};

  constructor(private _state:GlobalState, public authService: AuthService, public router: Router, public account:Account) {

    this._state.subscribe('menu.isCollapsed', (isCollapsed) => {
      this.isMenuCollapsed = isCollapsed;
    });

    this._state.subscribe('profile.photo.updated', (data) => {
      if(data.photo.url){ 
        this.profileUrl = data.photo.url;
      }
      
    });

  }

  ngOnInit() {

    this.account.getAccountData().subscribe( (res) => {
      this.profile = res.User;
      if(res.User.photo && res.User.photo.url) {
        this.profileUrl = res.User.photo.url;
      }
    });

  }

  logout() {
    this.authService.logout().subscribe( (res) => {
      this.authService.isLoggedIn = res.session;
      this.router.navigate(['/login']);
    });
  }

  public toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    this._state.notifyDataChanged('menu.isCollapsed', this.isMenuCollapsed);
  }

  public scrolledChanged(isScrolled) {
    this.isScrolled = isScrolled;
  }

  getProfileEditLink() {
    if(this.account.profile.userRole == 'editor') {
      return '#/pages/editors/profile';
    } else {
      return '#/';
    }
  }
}
