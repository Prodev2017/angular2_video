import {Component, ViewEncapsulation, ViewChild, ElementRef, NgZone} from '@angular/core';
import {FormGroup, AbstractControl, FormBuilder, Validators} from '@angular/forms';
import {EmailValidator, EqualPasswordsValidator, UrlValidator} from '../../../../theme/validators';

import { FileUploader } from 'ng2-file-upload/ng2-file-upload';
import { Account, AuthService } from '../../../../theme/services';
import { GlobalState } from '../../../../global.state';

declare var google:any;

@Component({
  selector: 'editor-profile',
  encapsulation: ViewEncapsulation.None,
  template: require('./profile.html'),
  styles: [require('./profile.scss')]
})

export class MemberProfile {
  @ViewChild ('addressAutocomplete') addressAutocomplete:ElementRef;
  
  public form:FormGroup;
  public firstName:AbstractControl;
  public lastName:AbstractControl;
  public email:AbstractControl;
  public password:AbstractControl;
  public repeatPassword:AbstractControl;
  public passwords:FormGroup;
  public address:AbstractControl;
  public addressText:AbstractControl;
  public stageName:AbstractControl;
  public jobTitle:AbstractControl;
  public phoneNumber:AbstractControl;

  addressSuggestions:Array<any> = [];
  autocompleteAddressService:any;
  
  constructor(public account:Account, public _state:GlobalState, public authService:AuthService, fb:FormBuilder, public _zone:NgZone) {
      this.account.profile = Object.assign(this.account.profile, this.authService.authResponse.profileData);

          this.form = fb.group({
      'firstName': [this.account.profile.name.first, Validators.compose([Validators.required])],
      'lastName': [this.account.profile.name.last, Validators.compose([Validators.required])],
      'email': [this.account.profile.email, Validators.compose([Validators.required, EmailValidator.validate])],
      'passwords': fb.group({
        'password': [''],
        'repeatPassword': [''],
      }, { validator: EqualPasswordsValidator.validate('password', 'repeatPassword') } ),
      'stageName': [this.account.profile.stageName, Validators.compose([Validators.required])],
      'payPalEmailAddress':  [this.account.profile.payPalEmailAddress, Validators.compose([Validators.required, EmailValidator.validate])],
      'yearStarted': [this.account.profile.yearStarted, Validators.compose([Validators.required, Validators.minLength(4), Validators.maxLength(4)])],
      'address': [this.account.profile.address, Validators.compose([Validators.required])],
      'addressText': [this.account.profile.addressText, Validators.compose([Validators.required])],
      'jobTitle': [this.account.profile.jobTitle, Validators.compose([Validators.required])],
      'phoneNumber': [this.account.profile.phoneNumber, Validators.compose([Validators.required])],

    });

    this.firstName = this.form.controls['firstName'];
    this.lastName = this.form.controls['lastName'];
    this.email = this.form.controls['email'];
    this.passwords = <FormGroup> this.form.controls['passwords'];
    this.password = this.passwords.controls['password'];
    this.repeatPassword = this.passwords.controls['repeatPassword'];
    this.stageName = this.form.controls['stageName'];
    this.address = this.form.controls['address'];
    this.addressText = this.form.controls['addressText'];
    this.jobTitle = this.form.controls['jobTitle'];
    this.phoneNumber = this.form.controls['phoneNumber'];

  }

  ngOnInit() {


      this.autocompleteAddressService = new google.maps.places.Autocomplete(this.addressAutocomplete.nativeElement, {type: ['geocode']});
      this.autocompleteAddressService.addListener('place_changed', (autocompleteResponse) => {
        
        this.setAddress();
        
        
      });

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
  
  updateProfile(values) {

        this.account.updateProfile(values).subscribe( (res) => {
          
        this.account.profile = res;
        
        this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Profile Updated', detail: "Your changes have been saved."});
        
      });


  }

}