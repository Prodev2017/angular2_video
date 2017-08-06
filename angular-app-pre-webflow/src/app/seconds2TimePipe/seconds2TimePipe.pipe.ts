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
@Pipe({name: 'seconds2time'})
export class seconds2time implements PipeTransform {
  transform(value:number) : any {
    var minutes = Math.floor(value/60);
    var seconds = value % 60;
    var revisedSeconds:any;
    if(seconds < 10) {
      revisedSeconds = '0' + seconds;
    } else {
      revisedSeconds = seconds;
    }
    return minutes + ':' + revisedSeconds;
  }
}
