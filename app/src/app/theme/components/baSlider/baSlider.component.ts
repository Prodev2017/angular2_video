import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChildren} from '@angular/core';
import Timer = NodeJS.Timer;


@Component({
  selector: 'ba-slider',
  styles: [require('./baSlider.scss')],
  template: `
    <figure *ngFor="let item of images">
      <a [href]="item.url"><img [src]="path + item.img"></a>
    </figure>`
})
export class BaSlider implements OnInit, OnDestroy {
  @Input() images: string[];
  @Input() path: string;
  @Input() interval: number = 5000;
  private intervalId: number;

  constructor(private elementRef: ElementRef) {
    this.elementRef = elementRef;
  }

  private showNextSlide() {
    const activeEl = this.elementRef.nativeElement.querySelector('.current');
    if (activeEl) {
      const prevEl = activeEl.previousElementSibling || activeEl.parentNode.lastElementChild;
      const nextEl = activeEl.nextElementSibling || activeEl.parentNode.firstElementChild;
      activeEl.classList.remove('current');
      activeEl.classList.add('previous');

      prevEl.classList.remove('previous');
      nextEl.classList.add('current');
    }
  }

  ngOnInit() {
    setTimeout(() => {
      this.elementRef.nativeElement.firstElementChild.classList.add('current');
      this.intervalId = setInterval(this.showNextSlide.bind(this), this.interval);
    });
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
