import {Pipe, PipeTransform} from '@angular/core';
/*
 * Raise the value exponentially
 * Takes an exponent argument that defaults to 1.
 * Usage:
 *   value | exponentialStrength:exponent
 * Example:
 *   {{ 2 |  exponentialStrength:10}}
 *   formats to: 1024
*/
@Pipe({name: 'string2Date'})
export class string2Date implements PipeTransform {
  transform(value:string) : any {
    if(value) {
      return new Date(value);
    } else {
      return value;
    }
  }
}
