import {Component, ViewEncapsulation, ViewChild, ElementRef} from '@angular/core';
import {FormGroup, AbstractControl, FormBuilder, Validators} from '@angular/forms';
import {EmailValidator, EqualPasswordsValidator} from '../../../../theme/validators';
import {Http, Headers, RequestOptions} from '@angular/http';
import {IMAGES_ROOT, LOGO_PATH} from '../../../../theme';
import { GlobalState } from '../../../../global.state';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../theme/services/auth';
declare var google:any;

@Component({
  selector: 'register-customer',
  encapsulation: ViewEncapsulation.None,
  styles: [require('./customer.scss')],
  template: require('./customer.html'),
})
export class RegisterCustomer {
  @ViewChild ('addressAutocomplete') addressAutocomplete:ElementRef;

  public logoUrl:string = IMAGES_ROOT + LOGO_PATH;
  public completeSignupForm:FormGroup;
  public emailVerifyForm:FormGroup;
    public firstName:AbstractControl;
  public lastName:AbstractControl;

  public email:AbstractControl;
  public address:AbstractControl;
  public addressText:AbstractControl;
  public passwords:FormGroup;
  public password:AbstractControl;
  public country:AbstractControl;
  public repeatPassword:AbstractControl;
  public phoneNumber:AbstractControl;
  public jobTitle:AbstractControl;
  public stageName:AbstractControl;
  public submitted:boolean = false;
  public countries:Array<string> = [];
  public isCompletingSignup:boolean = false;
  public cid:string;
  public userId:string;
  addressSuggestions:Array<any> = [];
  autocompleteAddressService:any;

  constructor(fb:FormBuilder, public authService: AuthService, public _state:GlobalState, public http:Http, public route:ActivatedRoute, public router: Router) {
    if(this.authService.isLoggedIn) {
       this.router.navigate(['/']);
    } else {
      
    this.emailVerifyForm = fb.group({
      'firstName': ['', Validators.compose([Validators.required])],
      'lastName': ['', Validators.compose([Validators.required])],
      'email': ['', Validators.compose([Validators.required, EmailValidator.validate])],
    });
    
    this.completeSignupForm = fb.group({
      'passwords': fb.group({
        'password': ['', Validators.compose([Validators.required, Validators.minLength(8)])],
        'repeatPassword': ['', Validators.compose([Validators.required, Validators.minLength(8)])],
      }, {validator: EqualPasswordsValidator.validate('password', 'repeatPassword')} ),
      'country':['United States', Validators.compose([Validators.required])],
      'addressText': ['', Validators.compose([Validators.required])],
      'stageName': ['', Validators.compose([Validators.required])],
      'jobTitle': ['', Validators.compose([Validators.required])],
      'phoneNumber':['', Validators.compose([Validators.required])]
    });

    this.countries = ['Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Aruba','Australia','Austria','Azerbaijan','Bahamas, The','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burma','Burundi','Cambodia','Cameroon','Canada','Cabo Verde','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo, Democratic Republic of the','Congo, Republic of the','Costa Rica','Cote d\'Ivoire','Croatia','Cuba','Curacao','Cyprus','Czechia','Denmark','Djibouti','Dominica','Dominican Republic','East Timor (see Timor-Leste)','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Fiji','Finland','France','Gabon','Gambia, The','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Holy See','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Korea, North','Korea, South','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Macau','Macedonia','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','Norway','Oman','Pakistan','Palau','Palestinian Territories','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Sint Maarten','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Swaziland','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom', 'United States','Uruguay','Uzbekistan','Vanuatu','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];

    this.firstName = this.emailVerifyForm.controls['firstName'];
    this.lastName = this.emailVerifyForm.controls['lastName'];
    
    this.email = this.emailVerifyForm.controls['email'];
    this.passwords = <FormGroup> this.completeSignupForm.controls['passwords'];
    this.password = this.passwords.controls['password'];
    this.repeatPassword = this.passwords.controls['repeatPassword'];
    this.country = this.completeSignupForm.controls['country'];
    this.addressText = this.completeSignupForm.controls['addressText'];
    this.stageName = this.completeSignupForm.controls['stageName'];
    this.jobTitle = this.completeSignupForm.controls['jobTitle'];
    this.phoneNumber = this.completeSignupForm.controls['phoneNumber'];
    
    }

  }
  
  ngOnInit() {
    
        this.route
      .queryParams
      .subscribe(params => {
        
        if(params && params['cid']) {
        
        this.cid = params['cid'];
          
        }
        
        if(params && params['uid']) {
          
                  this.userId = params['uid'];

          
        }
        if(this.userId && this.cid) {
          
          this.isCompletingSignup = true;
        }
        

      });
     
      /*this.autocompleteAddressService = new google.maps.places.Autocomplete(this.addressAutocomplete.nativeElement, {type: ['geocode']});
      this.autocompleteAddressService.addListener('place_changed', (autocompleteResponse) => {
        
        this.setAddress();

      });*/

    
  }
  
    setAddress() {
  
    var components = {
            street_number: '',
          route: '',
          locality: '',
          sublocality_level_1: '',
          administrative_area_level_1: '',
          country: '',
          postal_code: ''
  }
      var componentForm = {
        street_number: 'short_name',
        route: 'long_name',
        locality: 'long_name',
        sublocality_level_1: 'long_name',
        administrative_area_level_1: 'short_name',
        country: 'long_name',
        postal_code: 'short_name'
      };
      
      if(this.autocompleteAddressService){
        
     
          var thePlaceSelected = this.autocompleteAddressService.getPlace();

      }
      
    if(thePlaceSelected && thePlaceSelected.address_components && thePlaceSelected.formatted_address) {
      
              for (var i = 0; i < thePlaceSelected.address_components.length; i++) {
              var addressType = thePlaceSelected.address_components[i].types[0];
              if (componentForm[addressType]) {
                var val = thePlaceSelected.address_components[i][componentForm[addressType]];
                components[addressType] = val;
              }
            }
            
            var locationData = {
              street1: components.street_number + ' ' + components.route,
              suburb: components.sublocality_level_1 || components.locality,
              state: components.administrative_area_level_1,
              postcode: components.postal_code,
              country: components.country
            }
            
                    this.addressText.setValue(thePlaceSelected.formatted_address);
        this.address.setValue(locationData);

    }
        
  }


  public onEmailVerifySubmit(values:Object):void {
    this.submitted = true;
    if (this.emailVerifyForm.valid) {

      let body = JSON.stringify(values);
      let headers = new Headers({'Content-Type': 'application/json'});
      let options = new RequestOptions({ headers: headers });
  
      this.http.post('/api/v1/members/account/create',body, options)
      .map((res) => {
         return res.json();
      }).subscribe( (response) => {
          
          this._state.notifyDataChanged('growlNotifications.update', {severity:'success', summary:'Email Verification Sent', detail: 'You are one step closer to completing your account. Check your inbox for an email verification (be sure to check the spam folder if you do not see the email).'});
          
          this.emailVerifyForm.reset();

      }, (error) => {
        
          error = error.json();
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Error', detail: error.error});
           
      });
      
    }
  }
  
    public onSignupCompletionSubmit(values:Object):void {
    this.submitted = true;
      var invalidFields = [];
  var formControlKeys = Object.keys(this.completeSignupForm.controls);
  
  for(var property in this.completeSignupForm.controls) {
    
    if(!this.completeSignupForm.controls[property].valid) {
      
      invalidFields.push(property);
      
    }
    
  }
  
    if (invalidFields.length == 0 && this.completeSignupForm.valid) {

      let body = JSON.stringify(Object.assign(values,{uid: this.userId, cid: this.cid}));
      let headers = new Headers({'Content-Type': 'application/json'});
      let options = new RequestOptions({ headers: headers });
  
      this.http.post('/api/v1/members/account/activate',body, options)
      .map((res) => {
         return res.json();
      }).subscribe( (response) => {
          
          this.completeSignupForm.reset();

          this._state.notifyDataChanged('growlNotifications.update', {severity:'success', summary:'Account Activated', detail: 'Your account has been activated! You may now log in.'});
          this.router.navigate(['/login/user']);

      }, (error) => {
        
          error = error.json();
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Error', detail: error.error});
           
      });
      
    } else {
      
              this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Missing or Incomplete Fields', detail: "Please ensure you have the correct values set for the following fields: " + invalidFields.join(', ')});

      
    }
  }

  
}
