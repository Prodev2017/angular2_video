import {Component, ViewEncapsulation} from '@angular/core';
import { TabsModule } from 'ng2-bootstrap/ng2-bootstrap';
import { AuthService } from '../theme/services';

@Component({
  selector: 'pages',
  encapsulation: ViewEncapsulation.None,
  styles: ['pages.component.css'],
  template: `
    <ba-page-top></ba-page-top>
    <site-nav></site-nav>
    <div class="fixed-height-body" [ngClass]="{'is-editor': authService.authResponse.profileData.userRole == 'editor', 'is-member': authService.authResponse.profileData.userRole != 'editor' }">
      <div class="al-main">
        <div class="al-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
    
    `
})
export class Pages {

  constructor(public authService:AuthService) {

  }

  ngOnInit() {


  }
}
