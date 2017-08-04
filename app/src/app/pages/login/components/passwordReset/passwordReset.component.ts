import {Component, ViewEncapsulation} from '@angular/core';
import {FormGroup, AbstractControl, FormBuilder, Validators} from '@angular/forms';
import { AuthService } from '../../../../theme/services/auth';
import { Currency, Account } from '../../../../theme/services';
import { GlobalState } from '../../../../global.state';
import {EmailValidator, EqualPasswordsValidator} from '../../../../theme/validators';

import { Router, ActivatedRoute } from '@angular/router';
import {IMAGES_ROOT, LOGO_PATH} from '../../../../theme';
import {Http, Headers, RequestOptions} from '@angular/http';

@Component({
  selector: 'password-reset',
  encapsulation: ViewEncapsulation.None,
  styles: [require('./passwordReset.scss')],
  template: require('./passwordReset.html'),
})
export class PasswordReset {

  public logoUrl:string = IMAGES_ROOT + LOGO_PATH;
  public form:FormGroup;
  public email:string;
  public confirmationKey:string;
  public password:AbstractControl;
  public repeatPassword:AbstractControl;
  public submitted:boolean = false;

  constructor(fb:FormBuilder, public _state:GlobalState, public http:Http, private router: Router, public route: ActivatedRoute) {

    this.form = fb.group({
        'password': ['', Validators.compose([Validators.required, Validators.minLength(4)])],
        'repeatPassword': ['', Validators.compose([Validators.required, Validators.minLength(4)])]
      }, {validator: EqualPasswordsValidator.validate('password', 'repeatPassword')});

    this.password = this.form.controls['password'];
    this.repeatPassword = this.form.controls['repeatPassword'];

  }
  
  ngOnInit() {
    
        this.route
      .queryParams
      .subscribe(params => {
        
        this.email = params['email'];
        this.confirmationKey = params['confirmationKey'];

      });

    
  }

  public onSubmit(values:Object):void {
    this.submitted = true;
    if (this.form.valid) {
      
      var formData = Object.assign(values, {email: this.email, confirmationKey: this.confirmationKey});

      console.log(formData);

      let body = JSON.stringify(formData);
      let headers = new Headers({'Content-Type': 'application/json'});
      let options = new RequestOptions({ headers: headers });
  
      this.http.post('/api/v1/members/account/resetPassword',body, options)
      .map((res) => {
         return res.json();
      }).subscribe( (response) => {
          
          this._state.notifyDataChanged('growlNotifications.update', {severity:'success', summary:'Password Reset Successfully', detail: 'Your password was reset successfully. You may now try to log in with your new credentials.'});
          this.router.navigate(['/login']);

      }, (error) => {
        
          error = error.json();
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Password Reset Error', detail: error.error});
           
      });
      
    }
  }
  
}
