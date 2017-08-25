import './tooltipster.loader.ts';

import {NgModule,Directive,ElementRef,HostListener,Input} from '@angular/core';
import {CommonModule} from '@angular/common';

declare var jQuery;
declare var $;

@Directive({
    selector: '[tooltipster]',
    host: {
    },
})
export class Tooltipster  {

    @Input('tooltipster') text: string;

    @Input() tooltipsterPosition: string = 'right';
    
    @Input() tooltipsterEvent: string = 'hover';
        
    constructor(public el: ElementRef) {
        

    }
        
    ngOnInit() {
        
        
                
                    this.setup();

    }

    
    setup() {
        var $tooltipsterElement = jQuery(this.el.nativeElement);
        try {
            
            var status = $tooltipsterElement.tooltipster('instance');
            if(status) {
                $tooltipsterElement.trigger(this.tooltipsterEvent);
            }
            
        } catch(ex) {
            //console.log(ex);
             $tooltipsterElement.tooltipster({
                content: this.text,
                side: this.tooltipsterPosition,
                trigger: this.tooltipsterEvent,
                maxWidth: 200,
        		animation: 'grow',
        		theme: 'tooltipster-pink'

             });
             
        }
    }    
    
}
