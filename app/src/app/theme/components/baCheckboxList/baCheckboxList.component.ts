import {Component, Input, Self} from '@angular/core';
import {ControlValueAccessor, NgModel} from '@angular/forms';

@Component({
  selector: 'ba-checkboxlist',
  styles: [require('./baCheckboxList.scss')],
  template: require('./baCheckboxList.html')
})
export class BaCheckboxList implements ControlValueAccessor {
  @Input() options: any[];
  // @Input() label:string;
  @Input() value:string;
  // @Input() baCheckboxClass:string;
	//
  public model: NgModel;
  public state: boolean;

  public constructor(@Self() state: NgModel) {
    this.model = state;
    state.valueAccessor = this;
    console.log(this);
  }

  public onChange(value: any): void {}
  public onTouch(value: any): void {}
  public writeValue(state: any): void {
    this.state = state;
  }

  onCheck(item, event) {
    const targetEl = event.target;

    if (targetEl.checked) {
      this.model.value.push(item.value);
    } else {
      this.model.value.splice(this.model.value.indexOf(item.value), 1);
    }
  }

  public registerOnChange(fn: any): void {
    this.onChange = function(state: boolean) {
      this.writeValue(state);
      this.model.viewToModelUpdate(state);
    };
  }

  public registerOnTouched(fn: any): void { this.onTouch = fn; }
}
