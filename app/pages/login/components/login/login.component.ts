import {Component, ViewEncapsulation} from '@angular/core';
import {FormGroup, AbstractControl, FormBuilder, Validators} from '@angular/forms';
import { AuthService } from '../../../../theme/services/auth';
import { Currency, Account } from '../../../../theme/services';
import { GlobalState } from '../../../../global.state';
import { Router, ActivatedRoute } from '@angular/router';
import {IMAGES_ROOT, LOGO_PATH} from '../../../../theme';

@Component({
  selector: 'user-login',
  encapsulation: ViewEncapsulation.None,
  styles: [require('./login.scss')],
  template: require('./login.html'),
})
export class UserLogin {

  public logoUrl:string = IMAGES_ROOT + LOGO_PATH;
  public form:FormGroup;
  public email:AbstractControl;
  public password:AbstractControl;
  public submitted:boolean = false;

  constructor(public authService: AuthService, fb:FormBuilder, public router: Router, public _state:GlobalState, public route:ActivatedRoute, public account:Account) {

    this._state.notifyDataChanged('spinner.show', {});
    this.form = fb.group({
      'email': ['', Validators.compose([Validators.required, Validators.minLength(4)])],
      'password': ['', Validators.compose([Validators.required, Validators.minLength(4)])]
    });

      this.email = this.form.controls['email'];
      this.password = this.form.controls['password'];

    if(this.authService.isLoggedIn) {
      this.router.navigate(['/']);
    } 
    
  }
  
  ngOnInit() {

    this.route
      .queryParams
      .subscribe(params => {
        
        var confirmationStatus = params['confirmation'];

        if(confirmationStatus && confirmationStatus == 'success') {
          
          this._state.notifyDataChanged('growlNotifications.update', {severity:'success', summary:'Email Confirmed', detail: 'Thank you for confirming your email address. We will follow up on approval soon!'});
          
        }
        
        if(confirmationStatus && confirmationStatus == 'failure') {
          
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Confirmation Invalid', detail: 'Either this email was already confirmed or the confirmation has expired.'});

        }

      });
    
  }
  
  public ngAfterViewInit() {
    
        this._state.notifyDataChanged('spinner.hide', {});

    
  }

  public onSubmit(values:Object):void {
        this._state.notifyDataChanged('spinner.show', {});

    this.submitted = true;
    if (this.form.valid) {
      this.authService.login(values).subscribe( res => {
        this.authService.authResponse = res;
        this.authService.isLoggedIn = res.session;
        if(this.authService.isLoggedIn) {
          this.account.profile = res.profileData;
          this._state.notifyDataChanged('growlNotifications.update', {severity:'success', summary:'Logged In', detail: 'Redirecting you shortly...'});
          //this._state.notifyDataChanged('login.successful', res);

          this.router.navigate([this.authService.redirectUrl]);
        } else {
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Login Invalid', detail: res.message});
            this._state.notifyDataChanged('spinner.hide', {});

          
        }
      });
    }
  }
}
