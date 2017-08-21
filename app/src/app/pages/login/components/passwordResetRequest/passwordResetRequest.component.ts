import {Component, ViewEncapsulation} from '@angular/core';
import {FormGroup, AbstractControl, FormBuilder, Validators} from '@angular/forms';
import { Currency, Account } from '../../../../theme/services';
import { GlobalState } from '../../../../global.state';
import { Router, ActivatedRoute } from '@angular/router';
import { Http, RequestOptions, Headers } from '@angular/http';
import {IMAGES_ROOT, LOGO_PATH} from '../../../../theme';
import {EmailValidator, EqualPasswordsValidator} from '../../../../theme/validators';

@Component({
  selector: 'password-reset-request',
  encapsulation: ViewEncapsulation.None,
  styles: [require('./passwordResetRequest.scss')],
  template: require('./passwordResetRequest.html'),
})
export class PasswordResetRequest {

  public logoUrl:string = IMAGES_ROOT + LOGO_PATH;
  public form:FormGroup;
  public email:AbstractControl;
  public password:AbstractControl;
  public submitted:boolean = false;

  constructor(fb:FormBuilder, public router: Router, public http:Http, public _state:GlobalState, public route:ActivatedRoute, public account:Account) {

    this.form = fb.group({
        'email': ['', Validators.compose([Validators.required, EmailValidator.validate])],
      });

    this.email = <FormGroup> this.form.controls['email'];

  }

  public onSubmit(values:Object):void {
    this.submitted = true;
    if (this.form.valid) {

      this.http.get('/api/v1/members/account/passwordResetRequest?email=' + encodeURIComponent(this.email.value))
      .map((res) => {
         return res.json();
      }).subscribe( (response) => {
          
          this._state.notifyDataChanged('growlNotifications.update', {severity:'success', summary:'Password Reset Email Sent', detail: 'Check your email for a special link that will let you reset your password.'});
          this.router.navigate(['/login']);

      }, (error) => {
        
          error = error.json();
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Password Reset Error', detail: error.error});
           
      });
      
    }
  }
}
