import {Component, ContentChild, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {LazyLoadEvent} from 'primeng/primeng';



export interface LazyLoadCallBackEvent extends LazyLoadEvent {
  onLoad: any;
}

@Component({
  selector: 'ba-table',
  styles: [require('./baTable.scss')],
  template: `
    <div #scroll class="responsive-table" (scroll)="onScroll($event)">
      <div class="responsive-table-scroll-wrap" [ngStyle]="{'height.px' : totalRecords * 78}">
        <ng-content></ng-content>
      </div>
    </div>`
})
export class BaTable implements OnInit {
  @Input() totalRecords: number;
  @Input() value: any;
  @Output() onLazyLoad: EventEmitter<any> = new EventEmitter();
  @ViewChild('scroll') scrollEl;
  @ContentChild('thead') headerEl;

  first: any = 0;
  rows: any;
  @Input() sortField: any;
  @Input() sortOrder: any;
  filters: any;
  multiSortMeta: any;
  private lazyLoadInProgress = false;
  rowHeight: number = 78;
  virtualScroll: boolean = true;

  constructor() {
    console.log(this);
  }

  private collectionHas(a, b) { //helper function (see below)
    for(var i = 0, len = a.length; i < len; i ++) {
      if(a[i] == b) return true;
    }
    return false;
  }

  private findParentBySelector(elm, selector) {
    var all = document.querySelectorAll(selector);
    var cur = elm.parentNode;
    while(cur && !this.collectionHas(all, cur)) { //keep going up until you find a match
      cur = cur.parentNode; //go up
    }
    return cur; //will return null if not found
  }

  private updateSortIndicator(name, direction) {
    const thEl = this.headerEl.nativeElement.querySelector(`th[name="${name}"]`);
    if (thEl) {
      const dirIconEl: Element = thEl.querySelector('span.fa');

      if (dirIconEl) {
        dirIconEl.classList.remove('fa-sort-asc');
        dirIconEl.classList.remove('fa-sort-desc');

        if (direction === 1) {
          dirIconEl.classList.add('fa-sort-asc');
        } else if (direction === -1) {
          dirIconEl.classList.add('fa-sort-desc');
        }
      }
    }
  }

  ohHeaderClick(thEl) {
    if (thEl.getAttribute('sortable') === 'true') {
      if (this.sortField === thEl.getAttribute('name')) {
        if (this.sortOrder === -1) {
          this.sortOrder = 1;
        } else {
          this.sortOrder = -1;
        }
        this.updateSortIndicator(this.sortField, this.sortOrder);
      } else {
        this.updateSortIndicator(this.sortField, null);
        this.sortField = thEl.getAttribute('name');
        this.sortOrder = 1;
        this.updateSortIndicator(this.sortField, this.sortOrder);
      }

      this.first = 0;
      this.scrollEl.nativeElement.scrollTop = 0;
      let event = <LazyLoadCallBackEvent>this.createLazyLoadMetadata();
      event.onLoad = () => {
        this.lazyLoadInProgress = false;
      };
      this.onLazyLoad.emit(event);
    }
  }

  ngOnInit() {
    this.headerEl.nativeElement.addEventListener('click', (event) => {
      this.ohHeaderClick(this.findParentBySelector(event.target, 'th'));
    });

    setTimeout(() => {
      this.updateSortIndicator(this.sortField, this.sortOrder);
    });
  }

  createLazyLoadMetadata(): LazyLoadEvent {
    return {
      first: this.first,
      rows: this.rows,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
      filters: this.filters,
      multiSortMeta: this.multiSortMeta
    };
  }

  onScroll(event) {
    if (this.virtualScroll) {
      if (!this.lazyLoadInProgress &&
        this.totalRecords > this.value.length &&
        event.target.scrollTop > this.value.length * this.rowHeight - event.target.offsetHeight * 1.1) {
        this.first += 25;
        this.lazyLoadInProgress = true;
        let event = <LazyLoadCallBackEvent>this.createLazyLoadMetadata();
        event.onLoad = () => {
          this.lazyLoadInProgress = false;
        };
        this.onLazyLoad.emit(event);
      }
    }
  }
}
