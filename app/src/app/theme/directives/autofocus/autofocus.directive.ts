import {Directive, AfterViewInit, ElementRef, DoCheck} from '@angular/core';

@Directive({ selector: '[autofocus]' })
export class Autofocus implements AfterViewInit, DoCheck {

    constructor(private el: ElementRef) {}

    ngAfterViewInit() {
     this.ngDoCheck(); 
    }
    
    ngDoCheck() { 
     this.el.nativeElement.focus(); 
    }

}
