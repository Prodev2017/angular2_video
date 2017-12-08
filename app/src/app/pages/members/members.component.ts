import {Component} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';

@Component({
  selector: 'members',
  template: require('./members.html'),
})
export class Members {
  
  activePath:any;
  
  constructor(public router: Router, private _router: ActivatedRoute) {
  }
  
  ngOnInit(){
        this.activePath = this._router.snapshot.children[0].url[0].path;
  }
  
  
  
}
