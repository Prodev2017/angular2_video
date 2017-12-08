import {Component} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';

@Component({
  selector: 'editors',
  template: require('./editors.html'),
})
export class Editors {
  
  activePath:any;
  
  constructor(public router: Router, private _router: ActivatedRoute) {
  }
  
  ngOnInit(){
        this.activePath = this._router.snapshot.children[0].url[0].path;
  }
  
  changeRoute(path) {
    
    this.router.navigate(['/pages/editors/'+path]);
    
  }
  
  
}
