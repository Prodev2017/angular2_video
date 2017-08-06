import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'filterTagOptionsForSetting',
    pure: false
})
export class FilterTagOptionsForSetting implements PipeTransform {
    transform(items: any[], args: any[]): any {
        // filter items array, items which match and return true will be kept, false will be filtered out
        return items.filter((item) => {

          if(item.tagField) {
            return item.tagField.indexOf(args[0].tagField) !== -1
          } else {
            return false;
          }

        });
    }
}

@Pipe({
    name: 'filterAlreadySelectedGenres',
    pure: false
})
export class FilterAlreadySelectedGenres implements PipeTransform {
    transform(items: any[], args: any[]): any {
        // filter items array, items which match and return true will be kept, false will be filtered out
      console.log(items,args);
        return items.filter(item => item._id.indexOf(args[0]._id) !== -1);
    }
}
