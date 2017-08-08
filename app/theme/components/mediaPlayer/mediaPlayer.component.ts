import {Component, ViewEncapsulation, ViewChild, ElementRef} from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { GlobalState } from '../../../global.state';
import { AppState } from '../../../app.service';
import { Currency } from '../../services';
import { WaveSurfer, videojs } from './mediaPlayer.loader';

@Component({
  selector: 'media-player',
  styles: [require('./mediaPlayer.scss')],
  template: require('./mediaPlayer.html'),
})
export class MediaPlayer {
  
  @ViewChild('videoPlayer') videoPlayer:any;
  @ViewChild('waveformPlayer') waveformPlayer:any;
  currentTrack:any = {};
  trackUrl:string = '';
  isPlaying:boolean = false;
  wavesurfer:any;
  selectedCurrencySlug:string;
  selectedCurrencyColor:string;
  waveformUrl:string = '';
  mediaElt:any;
  fileType:string;
  showTrackPlayer:boolean = false;
  isVideoJSInitialized:boolean = false;
    events:Array<any> = [];

  constructor(private _state:GlobalState, public appState:AppState, public currency:Currency) {
    

    
    this.currentTrack = { name: "Click a Track To Play Here",
          artistPrimaryName: "",
          artistsFeaturedPrimaryName: "",
          version: "",
          _id: 0,
          url: ''
    }
    
      this.events.push(this._state.subscribe('currency.changed', (data) => {
        
        this.selectedCurrencySlug = data.slug;
        this.selectedCurrencyColor = data.color;

      }));
    
    this.events.push(this._state.subscribe('waveform.seekChange', (data) => {
      
    }));
    
    this.events.push(this._state.subscribe('player.pause', () => {
      this.isPlaying = false;
    }));

    this.events.push(this._state.subscribe('player.ended', () => {
      this.isPlaying = false;
    }));
    
    this.events.push(this._state.subscribe('player.play', () => {
      videojs(this.videoPlayer.nativeElement).play(); 
      this.isPlaying = true;

    }));
    
    this.events.push(this._state.subscribe('player.pause', () => {
      
      videojs(this.videoPlayer.nativeElement).pause(); 
      
    }));
    
    
    this.events.push(this._state.subscribe('player.changeTrack', (data) => {
      this.currentTrack = data;
      this.trackUrl = data.url;
      this.fileType = data.fileType;
      if(!this.isVideoJSInitialized) {
        
        this.initVideoJS();
        
      }
      
            var videojsplayer = videojs(this.videoPlayer.nativeElement);

            videojsplayer.src({src: data.url});

        var element:any = document.querySelector('#player_videojs .vjs-control-bar');
      element.style.backgroundColor = this.selectedCurrencyColor;
      element.style.backgroundImage = 'url(' + data.waveformUrl + ')';

      this._state.notifyDataChanged('player.play', {});
      
    }));
    
    this.events.push(this._state.subscribe('player.toggle', (data) => {
      console.log('player toggle');
      this.showTrackPlayer = true;
      this.waveformUrl = data.waveformUrl;
      this.selectedCurrencySlug = this.currency.selectedCurrency.slug;
      this.selectedCurrencyColor = this.currency.selectedCurrency.color;


      if(this.trackUrl != data.url){
        
        this._state.notifyDataChanged('player.pause', {});
        this._state.notifyDataChanged('player.changeTrack', data);
        
      } else {
        

            if (this.isPlaying) {
              this._state.notifyDataChanged('player.pause', {});
           } else {
              this._state.notifyDataChanged('player.play', {});
            }

        }
  
    }));
    
    
  }
  
  public initVideoJS() {
        if(!this.isVideoJSInitialized) {
          
        
        var self = this;

        videojs(this.videoPlayer.nativeElement).on('ready', function() {
      
          var element:any = document.querySelector('#player_videojs .vjs-control-bar');
          element.style.backgroundImage = "url(" + self.waveformUrl + ")";
          self.isVideoJSInitialized = true;
          
    });
    
    videojs(this.videoPlayer.nativeElement).on('ended', () => {
      
      this._state.notifyDataChanged('player.pause', {});
      
    });
}
    
    
  }
  
  public ngOnInit() {


    
  }
  
  public ngOnDestroy () {
    
        console.log('the events that we will unsubscribe from', this.events);
        for(var i = 0; i < this.events.length; i++) {
          
          this._state.unsubscribe(this.events[i].event, this.events[i].callback);
          
        }
        
        this.events = [];
    videojs(this.videoPlayer.nativeElement).dispose();
    
  }
  
  public ngAfterViewInit() {
    
    var self = this;
    
    if(this.trackUrl) {
      
      this.initVideoJS();
      
    }
      
   /* this.wavesurfer = Object.create(WaveSurfer);
    
    this.wavesurfer.init({
      container: this.waveformPlayer.nativeElement,
      waveColor: '#A8DBA8',
      progressColor: '#3B8686',
      backend: 'MediaElement',
      hideScrollbar: true,
    });
    
    this.mediaElt = this.videoPlayer.nativeElement;
    this.wavesurfer.load(this.mediaElt, [0.931254839761152,0.9723230862560402,0.9685364249800343,0.9826873722975972,0.9659728855721679,0.9713440195886535,0.958850555999694,0.7304837130929531,0.9001929624030162,0.9775714036028318,0.9439931871876482,0.8776801192104265,0.9655837128028043,0.8841730796932268,0.9679378391554766,0.9784697584566446,0.973834667718344,0.9747858640132511,0.9773408059947283,0.9789183548119802,0.9776866640626454,0.9763596230535532,0.9727537549198606,0.9683252386971932,0.961794560882127,0.9507661802509104,0.9839642553822797,0.9241349451693676,0.9769947176541963,0.9106609787106876,0.8272895764973214,0.8601716836445078,0.7873570616372422,0.9731375628405052,0.94735432151957,0.8530408532673431,0.5570969117528027,0.9807088853260197,0.9788148668924556,0.9747974532061758,0.9717288739024699,0.9778825482272322,0.9789183548119802,0.9794239998011166,0.9804911367139089,0.9806401324333252,0.9719153669272766,0.9682196131283037,0.939791101363064,0.9824590285969247,0.9766714937830664,0.9739507607464812,0.8937369419891066,0.7553463189302448,0.932754814970823,0.9596388709854133,0.9869391280073659,0.9825732129311884,0.8721676131744166,0.7185397599181135,0.9737069353451971,0.9802962318635244,0.9750986813797627,0.9764520487181305,0.9793435891223577,0.9789413493333393,0.9800668386665721,0.9789413493333393,0.980697427140298,0.9797569975454923,0.973625634712741,0.9796651573633617,0.9278601553879677,0.9644026008525118,0.9699304312317131,0.9495137686871062,0.9060863849300216,0.8468684569138026,0.7984493322540578,0.6713233252043592,0.6128629362788404,0.40658640385754663,0.8443641704955838,0.9804452833065913,0.9755154780403322,0.9708187562947677,0.9749365033289294,0.9776059844237616,0.9791022825466877,0.9759088122320929,0.9731026829620055,0.9747279141642268,0.9692280413990199,0.9652768844492665,0.9805713704707606,0.964449897440772,0.8984959355571333,0.9746351809364207,0.8001376682096292,0.6387222487578235,0.9794584577196659,0.963739991323095,0.8916477623029704,0.9467671198229564,0.8996548657945559,0.9413771756186625,0.9799865271809297,0.9791482543278648,0.9769600961407737,0.9698134325758225,0.9776059844237616,0.9712623469995002,0.9740436164512563,0.9725792026917695,0.968595072499108,0.965265079704497,0.964792667674883,0.9813615860029083,0.9339616103069018,0.9775368204816615,0.9261285963054967,0.8386716120648742,0.826220563449929,0.8062846316160872,0.9743220838138187,0.9436115023416974,0.9110424658550599,0.6431010140746739,0.9817848320906329,0.98184200118009,0.976475152564737,0.9716589216838635,0.9705617665553764,0.9791712386961798,0.9792401857133294,0.9795962665973205,0.9811326612537299,0.9734978507988624,0.9627919216374412,0.917781290159416,0.9805599092616692,0.9724045915946179,0.9690640128688928,0.9131026289281123,0.7858255730972604,0.9540105014593727,0.9792172043888026,0.9788493651520325,0.9783086294867323,0.9140053269137326,0.7509364475336848,0.9815560930665184,0.9800783107253764,0.9728584580196634,0.9778825482272322,0.979194222049788,0.9792516759951958,0.9795043980644279,0.9806286727361612,0.9805025994354137,0.97805532594333,0.9788608640637557,0.9789183548119802,0.9741248515507863,0.9788033669644172,0.9588386024916122,0.9733584142141176,0.953865674587566,0.8955457158354546,0.8651167618790204,0.8867789667196027,0.6025561982413333,0.4359593943403046,0.482642541604821,0.9795733009834048,0.978078358636064,0.9729515096731958,0.9738230569852109,0.9775829307987051,0.9790103268030801,0.9767176809344627,0.974669957839897,0.9763711771611095,0.9701526557035288,0.9674561188282756,0.9780322922305797,0.9789298521996405,0.923160772888568,0.9728119259222292,0.8152115821057538,0.6587051726109477,0.980926543016675,0.9460934465237867,0.8746129151216957,0.9643671255560607,0.9039030395885127,0.9700824898804783,0.9800324209744092,0.9805369860873674,0.978734362059335,0.9690640128688928,0.9758972478321736,0.9751913317957522,0.9759088122320929,0.967573653097228,0.9768215870149882,0.9682900325771957,0.9692631835904263,0.9759666303682524,0.9723696623066445,0.9707720403895471,0.9763596230535532,0.8858103433137415,0.8774546401056929,0.7800120862707517,0.9637873489134946,0.9167295315696621,0.9130109582424251,0.7401361018171971,0.9716822401410142,0.9813501421517318,0.9818991640062606,0.9657016750182525,0.9799406293440716,0.9795273667170667,0.9793206123616692,0.9800668386665721,0.980834908749152,0.9710522725233443,0.9681022260129539,0.9188437564711525,0.9776520886074954,0.9805942921328922,0.9806286727361612,0.9417729154512904,0.8219826444981712,0.7849282700772869,0.9734513761066995,0.9701058795469419,0.9741828688291987,0.8752505999940325,0.746385164565133,0.9614259970032362,0.9825389602531391,0.9817848320906329,0.9726024797224498,0.9779977397486848,0.9791022825466877,0.9792172043888026,0.9793895396021796,0.9824247684259249,0.980697427140298,0.9655483188657024,0.9639057238006639,0.9388594344117935,0.968888210157344,0.9511667862486277,0.9483680885351441,0.9167555279262302,0.9140183973254635,0.8267239423522055,0.7909324738562331,0.5872230770938637,0.4377941047464157,0.4443715018629958,0.9804682105145364,0.974716323417441,0.9713790181790941,0.973404897245421,0.9773292734287293,0.9796307131194351,0.975156589828513,0.9722997966590605,0.976290293009943,0.9721134421478437,0.9687123475443004,0.9423535959253019,0.9804338193243701,0.9028076916821722,0.9214642290866778,0.8171749514377799,0.6570979202170771,0.9773292734287293,0.9233531952428987,0.9053419496448945,0.9775137637894524,0.9500005089322583,0.8511366244497844,0.9803306321344922,0.9798717750055498,0.9782856069881103,0.979194222049788,0.9797340390181256,0.9789068571703422,0.9793321008687557,0.979745518408307,0.9790218221594226,0.9699889206241108,0.957078391072995,0.9802847646018618,0.9708304346114928,0.9778595068608595,0.9805369860873674,0.8967658739964904,0.8364608745608448,0.8021186477192427,0.9720784932056635,0.926256122213584,0.9212195507837835,0.7488174232396655,0.8647983565631718,0.9813844729519942,0.9802732970878393,0.9745076456681584,0.9754344604583773,0.9755849116176134,0.9785733150217426,0.9799291542529778,0.9814416859312727,0.9799865271809297,0.9641897123482626,0.9567184183585198,0.9724744431008596,0.9819105958200479,0.9810525138432954,0.965135209634192,0.8960070258810131,0.7008546449547435,0.9467916001546202,0.96908744870721,0.9814416859312727,0.934300498151846,0.7728422926188986,0.9811784542437163,0.977905588572763,0.9809609017151599,0.9715656373430891,0.9727188491814476,0.9791827304998144,0.978538798456681,0.9783201403539858,0.981270028161744,0.9818191342959953,0.9778940685275964,0.9620559618067762,0.979205713346113,0.9681961378422693,0.9550953935099422,0.965300493126384,0.9704332237545605,0.9516034512680578,0.9052621213832489,0.8551738352049347,0.6235544110164231,0.5297340472099834,0.39585595206145696,0.395359657436454,0.37667330306930835,0.36799712168631094,0.4054752810458541,0.37379616405759336,0.2864222652663683,0.3085835977571613,0.29187014221716295,0.25556788450563905,0.20602917554919498,0.23644017245003884,0.4871264036532445,0.9605808674015887,0.9432665066642195,0.8458291669146798,0.7345508905850453,0.5345607997581302,0.980834908749152,0.9802618293214442,0.9537328804539364,0.9684777707941807,0.9810525138432954,0.8898105602573184,0.6773895589350066,0.6198512017728627,0.5717755084425326,0.5738763343330386,0.5112144974177157,0.47280190331183064,0.5236473095600856,0.4192567902925256,0.3954148500685954,0.42472876381140484,0.4088465789742046,0.9759666303682524,0.9805255241221299,0.9522214190199686,0.9794699431858258,0.925886206973848,0.873235429326543,0.8357832376071724,0.8021684738606479,0.9719969364942366,0.9363915067813006,0.8071722773945453,0.4579889528935027,0.9378263741517102,0.9386853320143184,0.8665613504755427,0.5888589115315465,0.46834170240555867,0.39447490893541287,0.43037902154501106,0.9652768844492665,0.9178072311802294,0.8402921792303331,0.9276821844253429,0.9867126335073083,0.9802962318635244,0.9748901574293525,0.9806630510718424,0.9797799550609286,0.9793435891223577,0.9788033669644172,0.9788378659862501,0.9811212123778623,0.9763827310116431,0.9532134437481835,0.9774791768337207,0.9823905060062628,0.9756427658376361,0.9691343171922195,0.9794814283986629,0.9796307131194351,0.97944697200017,0.9785618097544596,0.9795503343566887,0.97805532594333,0.974669957839897,0.9699655256618054,0.9855673375999809,0.9687475248614137,0.9667856612368675,0.9780322922305797,0.972416234166878,0.9743800790269982,0.9791252689447383,0.9733932768785708,0.971122306831533,0.9738694983571996,0.9614854607050469,0.9485022912204448,0.9582764723830717,0.9225702118471555,0.8870139091553237,0.8414353636910756,0.830388032302217,0.8440312552759324,0.8450443861560947,0.9107399314204652,0.8684327196988549,0.9093432257258118,0.89891400839915,0.9624003324341883,0.9558414235187064,0.8458593241766579,0.8027825354461459,0.7462338592642578,0.9642843403443253,0.9787688656555698,0.9291295316598936,0.9227500222618961,0.9578574632005548,0.860274021423051,0.9460811896173484,0.9792746557981975,0.9701526557035288,0.9712506784338142,0.9732305643688967,0.9815675324000601,0.9799980010083335,0.9779171083627485,0.9753071215561266,0.9816247253052466,0.9701526557035288,0.9689819790547521,0.9793091236010842,0.9341122554299696,0.9563822148099772,0.9641187299188759,0.8368608253974527,0.8614274294536325,0.7994865020128635,0.9759781932228946,0.952596680064619,0.8874972525871896,0.7068994735335803,0.9837706435419358,0.9848289384470635,0.9700824898804783,0.9667738910333946,0.9778018989780262,0.9693920178318713,0.9895818700785404]);
    
    this.wavesurfer.on('finish', () => {
      
      this._state.notifyDataChanged('player.pause', {});
      
    });*/
    
  }
  
  public togglePlay() {
    
  var trackPlayerData = {
    name: this.currentTrack.name || '[title not set]',
    version: this.currentTrack.version  || '[version not set]',
    artistPrimaryName: this.currentTrack.artistPrimaryName  || '[artist not set]',
    artistsFeaturedPrimaryName: this.currentTrack.artistsFeaturedPrimaryName,
    _id: this.currentTrack._id,
    url: this.currentTrack.url,
    waveformUrl: this.currentTrack.waveformImageFileUrl,
    fileType: this.currentTrack.fileType
  }
  
    this._state.notifyDataChanged('player.toggle', trackPlayerData);
    
  }
  
  public updatePlayStatus() {
    
  }
  
  updateTime() {
    
    console.log('this is output of players', this.videoPlayer, this.waveformPlayer);
    
  }
  
  public loadTrack (trackUrl, trackId) {
    
  }
  
  public scrolledChanged(isScrolled) {
    
  }
  
}