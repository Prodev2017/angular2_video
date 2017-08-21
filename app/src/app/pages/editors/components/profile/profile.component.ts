import {Component, ViewEncapsulation, ViewChild, ElementRef, NgZone} from '@angular/core';
import {FormGroup, AbstractControl, FormBuilder, Validators} from '@angular/forms';
import {EmailValidator, EqualPasswordsValidator, UrlValidator, IfHasLengthValidator} from '../../../../theme/validators';

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

export class EditorProfile {
  @ViewChild ('addressAutocomplete') addressAutocomplete:ElementRef;
  
  public form:FormGroup;
  public firstName:AbstractControl;
  public lastName:AbstractControl;
  public email:AbstractControl;
  public password:AbstractControl;
  public repeatPassword:AbstractControl;
  public passwords:FormGroup;
  public taxInformation:FormGroup;
  public address:AbstractControl;
  public addressText:AbstractControl;
  public submitted:boolean = false;
  public stageName:AbstractControl;
  public yearStarted:AbstractControl;
  public payPalEmailAddress:AbstractControl;
  public taxId:AbstractControl;
  public hometown:AbstractControl;
  public currentLocation:AbstractControl;
  public biography:AbstractControl;
  public facebookUrl:AbstractControl;
  public twitterUrl:AbstractControl;
  public googleUrl:AbstractControl;
  public soundcloudUrl:AbstractControl;
  public youtubeUrl:AbstractControl;
  public instagramUrl:AbstractControl;
  public linkedinUrl:AbstractControl;
  public youTubeFeaturedVideoUrl:AbstractControl;
  public youTubeFeaturedVideoUrlDescription:AbstractControl;
  
  public soundCloudFeaturedTrackUrl1:AbstractControl;
  public soundCloudFeaturedTrackUrl1Description:AbstractControl;
  
  public soundCloudFeaturedTrackUrl2:AbstractControl;
  public soundCloudFeaturedTrackUrl2Description:AbstractControl;
  
  public soundCloudFeaturedTrackUrl3:AbstractControl;
  public soundCloudFeaturedTrackUrl3Description:AbstractControl;

  public photo:AbstractControl;
  public logoSquare:AbstractControl;
  public logoLong:AbstractControl;
  public backgroundImage:AbstractControl;
  public toggleTaxId:boolean = false;
  
  showTaxIdField:boolean;
  
  photoUploader:any;
  logoSquareUploader:any;
  logoLongUploader:any;
  backgroundImageUploader:any;
  
  addressSuggestions:Array<any> = [];
  autocompleteAddressService:any;
  
  constructor(public account:Account, public _state:GlobalState, public authService:AuthService, fb:FormBuilder, public _zone:NgZone) {
      this.account.profile = Object.assign(this.account.profile, this.authService.authResponse.profileData);
      this.account.profile.address = this.account.profile.address || { street1: null, suburb: null, state: null, postcode: null, country: null };
            
          this.form = fb.group({
      'firstName': [this.account.profile.name.first, Validators.compose([Validators.required])],
      'lastName': [this.account.profile.name.last, Validators.compose([Validators.required])],
      'email': [this.account.profile.email, Validators.compose([Validators.required, EmailValidator.validate])],
      'passwords': fb.group({
        'password': [''],
        'repeatPassword': [''],
      }, { validator: Validators.compose([EqualPasswordsValidator.validate('password', 'repeatPassword'), IfHasLengthValidator.validate('password', 'repeatPassword') ]) }),
      'stageName': [this.account.profile.stageName, Validators.compose([Validators.required])],
      'payPalEmailAddress':  [this.account.profile.payPalEmailAddress, Validators.compose([Validators.required, EmailValidator.validate])],
      'yearStarted': [this.account.profile.yearStarted, Validators.compose([Validators.required, Validators.minLength(4), Validators.maxLength(4)])],
      'taxInformation': fb.group({ 
        'address': [this.account.profile.address, Validators.compose([Validators.required])],
        'addressText': [this.account.profile.addressText, Validators.compose([Validators.required])],
        'taxId':  [this.account.profile.taxId] 
      }),
      'biography': [this.account.profile.biography, Validators.compose([Validators.required])],
      'facebookUrl': [this.account.profile.facebookUrl, Validators.compose([UrlValidator.validate])],
      'twitterUrl': [this.account.profile.twitterUrl, Validators.compose([UrlValidator.validate])],
      'youtubeUrl':[this.account.profile.youtubeUrl, Validators.compose([UrlValidator.validate])],
      'soundcloudUrl': [this.account.profile.soundcloudUrl, Validators.compose([UrlValidator.validate])],
      'instagramUrl': [this.account.profile.instagramUrl, Validators.compose([UrlValidator.validate])],
      'hometown': [this.account.profile.hometown, Validators.compose([Validators.required])],
      'currentLocation': [this.account.profile.currentLocation, Validators.compose([Validators.required])],

      'googleUrl': [this.account.profile.googleUrl, Validators.compose([UrlValidator.validate])],
      'linkedinUrl': [this.account.profile.linkedinUrl, Validators.compose([UrlValidator.validate])],
      'youTubeFeaturedVideoUrl': [this.account.profile.youTubeFeaturedVideoUrl, Validators.compose([UrlValidator.validate])],
      'youTubeFeaturedVideoDescription': [this.account.profile.youTubeFeaturedVideoDescription],
      
      'soundCloudFeaturedTrackUrl1': [this.account.profile.soundCloudFeaturedTrackUrl1, Validators.compose([UrlValidator.validate])],
      'soundCloudFeaturedTrackUrl1Description': [this.account.profile.soundCloudFeaturedTrackUrl1Description],
      'soundCloudFeaturedTrackUrl2': [this.account.profile.soundCloudFeaturedTrackUrl2, Validators.compose([UrlValidator.validate])],
      'soundCloudFeaturedTrackUrl2Description': [this.account.profile.soundCloudFeaturedTrackUrl2Description],
      'soundCloudFeaturedTrackUrl3': [this.account.profile.soundCloudFeaturedTrackUrl3, Validators.compose([UrlValidator.validate])],
      'soundCloudFeaturedTrackUrl3Description': [this.account.profile.soundCloudFeaturedTrackUrl3Description],
      
      'photo': [this.account.profile.photo.url, Validators.compose([Validators.required])],
      'logoSquare': [this.account.profile.logoSquare.url, Validators.compose([Validators.required])],
      'logoLong': [this.account.profile.logoLong.url, Validators.compose([Validators.required])],
      'backgroundImage': [this.account.profile.backgroundImage.url, Validators.compose([Validators.required])],
      
    });

    this.firstName = this.form.controls['firstName'];
    this.lastName = this.form.controls['lastName'];
    this.email = this.form.controls['email'];
    this.passwords = <FormGroup> this.form.controls['passwords'];
    this.taxInformation = <FormGroup> this.form.controls['taxInformation'];
    this.password = this.passwords.controls['password'];
    this.repeatPassword = this.passwords.controls['repeatPassword'];
    this.stageName = this.form.controls['stageName'];
    this.yearStarted = this.form.controls['yearStarted'];
    this.payPalEmailAddress = this.form.controls['payPalEmailAddress'];
    this.biography = this.form.controls['biography'];
    this.facebookUrl = this.form.controls['facebookUrl'];
    this.twitterUrl = this.form.controls['twitterUrl'];
    this.youtubeUrl = this.form.controls['youtubeUrl'];
    this.soundcloudUrl = this.form.controls['soundcloudUrl'];
    this.googleUrl = this.form.controls['googleUrl'];
    this.instagramUrl = this.form.controls['instagramUrl'];
    this.linkedinUrl = this.form.controls['linkedinUrl'];
    this.address = this.taxInformation.controls['address'];
    this.addressText = this.taxInformation.controls['addressText'];
    
    this.hometown = this.form.controls['hometown'];
    this.currentLocation = this.form.controls['currentLocation'];

    this.taxId = this.taxInformation.controls['taxId'];

    this.photo = this.form.controls['photo'];
    this.logoSquare = this.form.controls['logoSquare'];
    this.logoLong = this.form.controls['logoLong'];
    this.backgroundImage = this.form.controls['backgroundImage'];

    this.soundCloudFeaturedTrackUrl1 = this.form.controls['soundCloudFeaturedTrackUrl1'];
    this.soundCloudFeaturedTrackUrl1Description = this.form.controls['soundCloudFeaturedTrackUrl1Description'];
    
    this.soundCloudFeaturedTrackUrl2 = this.form.controls['soundCloudFeaturedTrackUrl2'];
    this.soundCloudFeaturedTrackUrl2Description = this.form.controls['soundCloudFeaturedTrackUrl2Description'];
    
    this.soundCloudFeaturedTrackUrl3 = this.form.controls['soundCloudFeaturedTrackUrl3'];
    this.soundCloudFeaturedTrackUrl3Description = this.form.controls['soundCloudFeaturedTrackUrl3Description'];

    this.photoUploader = new FileUploader({

        url: '/api/v1/members/account/update',
        autoUpload: true,
        itemAlias: 'photo_upload'

    });

    this.logoSquareUploader = new FileUploader({

        url: '/api/v1/members/account/update',
        autoUpload: true,
        itemAlias: 'logoSquare_upload'

    });
    
    this.logoLongUploader = new FileUploader({

        url: '/api/v1/members/account/update',
        autoUpload: true,
        itemAlias: 'logoLong_upload'

    });
    
    this.backgroundImageUploader = new FileUploader({

        url: '/api/v1/members/account/update',
        autoUpload: true,
        itemAlias: 'backgroundImage_upload'

    });
    


    

  }

  ngOnInit() {

      this.photoUploader.onSuccessItem = (item,response) => {

      var parsedResponse = JSON.parse(response);

      this.account.profile = parsedResponse.User;
      
      this.photo.setValue(this.account.profile.photo.url);

      this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Photo Updated', detail: "Your changes have been saved."});

      this._state.notifyDataChanged('profile.photo.updated', this.account.profile);

    };

    this.logoSquareUploader.onSuccessItem = (item,response) => {

      var parsedResponse = JSON.parse(response);

      this.account.profile = parsedResponse.User;
      
      this.logoSquare.setValue(this.account.profile.logoSquare.url);

      this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Logo Updated', detail: "Your changes have been saved."});

    };
    
    this.logoLongUploader.onSuccessItem = (item,response) => {

      var parsedResponse = JSON.parse(response);

      this.account.profile = parsedResponse.User;
      
      this.logoLong.setValue(this.account.profile.logoLong.url);

      this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Logo Updated', detail: "Your changes have been saved."});

    };
    
    this.backgroundImageUploader.onSuccessItem = (item,response) => {

      var parsedResponse = JSON.parse(response);

      this.account.profile = parsedResponse.User;
      
      this.backgroundImage.setValue(this.account.profile.backgroundImage.url);

      this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Logo Updated', detail: "Your changes have been saved."});

    };
    
                this.autocompleteAddressService = new google.maps.places.Autocomplete(this.addressAutocomplete.nativeElement, {type: ['geocode']});
                console.log(this.addressAutocomplete);
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

    }
        this.address.setValue(locationData);
        
  }
  
  toggleTaxIdField() {
    
    this.toggleTaxId = !this.toggleTaxId;
    
    this.taxId.setValue(null);
  }

  updateProfile(values) {

        this.account.updateProfile(values).subscribe( (res) => {
        console.log(res);
        this.account.profile = res;
        this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Profile Updated', detail: "Your changes have been saved."});
            if(this.taxId.value === true) {
      
              this.toggleTaxId = false;
              
            } else {
              
              this.toggleTaxId = true;
              
            }
      });


  }

}