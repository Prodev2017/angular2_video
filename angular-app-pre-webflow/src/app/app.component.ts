/*
* Angular 2 decorators and services
*/
import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AppState } from './app.service';
import { Account } from './account';
import { urlPrefix } from './globals/globals.service';
import { WaveSurferService } from './wavesurfer';
import { User } from './account/user.model';

/*
* App Component
* Top Level Component
*/
@Component({
  selector: 'app',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    './app.style.css'
  ],
  templateUrl: './app.template.html'
})
export class App {
  angularclassLogo = 'assets/img/angularclass-avatar.png';
  wavesurfer:any;
  name = 'Angular 2 Webpack Starter';
  url = 'https://twitter.com/AngularClass';

  constructor(
    public appState: AppState,
    public account: Account,
    private router: Router,
    private waveSurferService: WaveSurferService) {

      //this.account.isLoggedIn();
      this.account.checkAuth()
      .subscribe((res) => {
        if(!res) {
          this.account.loggedIn = res.session;
        } else {
          this.account.loggedIn = res.session;
          this.account.profileData = new User();
          this.account.profileData = Object.assign(this.account.profileData, res.profileData);
          console.log(res);
          return;
        }

      });

    }

    ngOnInit() {
      console.log('Initial App State', this.appState.get('state'));

      var self = this;
      console.log(this);
      this.waveSurferService.initialize();
      this.waveSurferService.wavesurfer.load(urlPrefix+'/audio/test-lowbit.mp3');
      this.appState.set('isPlaying', false);
      this.waveSurferService.wavesurfer.on('playing', function() {
        //  self.isPlaying = this.appState.set('isPlaying', true);
        //  self.isPaused = this.appState.set('isPlaying', false);
      })
      //this.appState.set('wavesurfer',this.wavesurfer);
    }



    logout() {
      this.account.logout().subscribe((res) => {

        this.router.navigate(['/login']);
        this.account.loggedIn = res;

      });
    }

  }

  /*
  * Please review the https://github.com/AngularClass/angular2-examples/ repo for
  * more angular app examples that you may copy/paste
  * (The examples may not be updated as quickly. Please open an issue on github for us to update it)
  * For help or questions please contact us at @AngularClass on twitter
  * or our chat on Slack at https://AngularClass.com/slack-join
  */
