import {Component, ViewEncapsulation} from '@angular/core';
import {FormGroup, AbstractControl, FormBuilder, Validators} from '@angular/forms';
import {EmailValidator, EqualPasswordsValidator, UrlValidator} from '../../../../theme/validators';
import {IMAGES_ROOT, LOGO_PATH} from '../../../../theme';
import { GlobalState } from '../../../../global.state';
import {Http, Headers, RequestOptions} from '@angular/http';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'register-editor',
  encapsulation: ViewEncapsulation.None,
  styles: [require('./editor.scss')],
  template: require('./editor.html'),
})
export class RegisterEditor {

  public logoUrl:string = IMAGES_ROOT + LOGO_PATH;
  public form:FormGroup;
  public name:AbstractControl;
  public email:AbstractControl;
  public password:AbstractControl;
  public repeatPassword:AbstractControl;
  public passwords:FormGroup;
  public payPalEmailAddress:AbstractControl;
  public logoSquare:AbstractControl;
  public logoLong:AbstractControl;
  public photo:AbstractControl;
  public stageName:AbstractControl;
  public hometown:AbstractControl;
  public currentCity:AbstractControl;
  public facebookUrl:AbstractControl;
  public twitterUrl:AbstractControl;
  public googleUrl:AbstractControl;
  public soundCloudUrl:AbstractControl;
  public yearStarted:AbstractControl;
  public yearCrooklynClanStarted:AbstractControl;
  public youTubeFeaturedVideoUrl:AbstractControl;
  public soundCloudFeaturedTrackUrl1:AbstractControl;
  public soundCloudFeaturedTrackUrl2:AbstractControl;
  public soundCloudFeaturedTrackUrl3:AbstractControl;
  public editorApplicationSampleLink1:AbstractControl;
  public editorApplicationSampleLink2:AbstractControl;
  public biography:AbstractControl;
  public submitted:boolean = false;
  public countries: Array<any> = [];
  public country:AbstractControl;
  
  constructor(fb:FormBuilder, public _state:GlobalState, public http:Http) {

    this.form = fb.group({
      'name': ['', Validators.compose([Validators.required, Validators.minLength(4)])],
      'stageName': ['', Validators.compose([Validators.required, Validators.minLength(4)])],
      'email': ['', Validators.compose([Validators.required, EmailValidator.validate])],
      'payPalEmailAddress': '',
      'logoSquare': '',
      'logoLong': '',
      'photo': '',
      'country':['United States', Validators.compose([Validators.required])],
      'hometown' : '',
      'currentCity': '',
      'facebookUrl': '',
      'twitterUrl' : '',
      'googleUrl' : '',
      'soundCloudUrl' : '',
      'yearStarted': '',
      'yearCrooklynClanStarted': '',
      'youTubeFeaturedVideoUrl': '',
      'soundCloudFeaturedTrackUrl1': '',
      'soundCloudFeaturedTrackUrl2': '',
      'soundCloudFeaturedTrackUrl3': '',
      'editorApplicationSampleLink1': ['', Validators.compose([Validators.required, UrlValidator.validate])],
      'editorApplicationSampleLink2': ['', Validators.compose([Validators.required, UrlValidator.validate])],
      'biography': '',
      'passwords': fb.group({
        'password': ['', Validators.compose([Validators.required, Validators.minLength(8)])],
        'repeatPassword': ['', Validators.compose([Validators.required, Validators.minLength(8)])]
      }, {validator: EqualPasswordsValidator.validate('password', 'repeatPassword')})
    });

    this.name = this.form.controls['name'];
    this.email = this.form.controls['email'];
    this.passwords = <FormGroup> this.form.controls['passwords'];
    this.password = this.passwords.controls['password'];
    this.repeatPassword = this.passwords.controls['repeatPassword'];
    this.logoSquare = this.form.controls['logoSquare'];
    this.logoLong = this.form.controls['logoLong'];
    this.photo = this.form.controls['photo'];
    this.payPalEmailAddress = this.form.controls['payPalEmailAddress'];
    this.stageName = this.form.controls['stageName'];
    this.hometown = this.form.controls['hometown'];
    this.currentCity = this.form.controls['currentCity'];
    this.facebookUrl = this.form.controls['facebookUrl'];
    this.twitterUrl = this.form.controls['twitterUrl'];
    this.googleUrl = this.form.controls['googleUrl'];
    this.soundCloudUrl = this.form.controls['soundCloudUrl'];
    this.yearStarted = this.form.controls['yearStarted'];
    this.yearCrooklynClanStarted = this.form.controls['yearCrooklynClanStarted'];
    this.editorApplicationSampleLink1 = this.form.controls['editorApplicationSampleLink1'];
    this.editorApplicationSampleLink2 = this.form.controls['editorApplicationSampleLink2'];
    this.youTubeFeaturedVideoUrl = this.form.controls['youTubeFeaturedVideoUrl'];
    this.biography = this.form.controls['biography'];
    this.country = this.form.controls['country'];
    
    this.countries = ['Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Aruba','Australia','Austria','Azerbaijan','Bahamas, The','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burma','Burundi','Cambodia','Cameroon','Canada','Cabo Verde','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo, Democratic Republic of the','Congo, Republic of the','Costa Rica','Cote d\'Ivoire','Croatia','Cuba','Curacao','Cyprus','Czechia','Denmark','Djibouti','Dominica','Dominican Republic','East Timor (see Timor-Leste)','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Fiji','Finland','France','Gabon','Gambia, The','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Holy See','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Korea, North','Korea, South','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Macau','Macedonia','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','Norway','Oman','Pakistan','Palau','Palestinian Territories','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Sint Maarten','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Swaziland','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom', 'United States','Uruguay','Uzbekistan','Vanuatu','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];

  }

  public onSubmit(values:Object):void {
    this.submitted = true;
    if (this.form.valid) {

      let body = JSON.stringify(values);
      let headers = new Headers({'Content-Type': 'application/json'});
      let options = new RequestOptions({ headers: headers });
  
      this.http.post('/api/v1/members/account/create/editor',body, options)
      .map((res) => {
         return res.json();
      }).subscribe( (response) => {
          
          this._state.notifyDataChanged('growlNotifications.update', {severity:'success', summary:'New Account Application Submitted', detail: 'Thank you for signing up to become a Crooklyn Clan editor! We will follow up with you via email. In the mean time, check your email for a confirmation link so we know you are really a human being and not a bot.'});
          
          this.form.reset();

      }, (error) => {
        
          error = error.json();
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'New Account Application Error', detail: error.error});
           
      });
      
    }
  }
}
