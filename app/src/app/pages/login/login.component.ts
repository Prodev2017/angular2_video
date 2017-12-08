import {Component, ViewEncapsulation} from '@angular/core';
import {FormGroup, AbstractControl, FormBuilder, Validators} from '@angular/forms';
import { AuthService } from '../../theme/services/auth';
import { Currency, Account } from '../../theme/services';
import { GlobalState } from '../../global.state';
import { Router, ActivatedRoute } from '@angular/router';
import {IMAGES_ROOT, LOGO_PATH} from '../../theme';

@Component({
  selector: 'login',
  encapsulation: ViewEncapsulation.None,
  styles: [require('./login.scss')],
  template: require('./login.html'),
})
export class Login {


  constructor(public authService: AuthService, fb:FormBuilder, public router: Router, public _state:GlobalState, public route:ActivatedRoute, public account:Account) {

  }
  
  ngOnInit() {
    
  }
  

  public onSubmit(values:Object):void {
    
  }
}
