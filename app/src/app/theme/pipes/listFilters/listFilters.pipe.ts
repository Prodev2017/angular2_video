import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'needsEditingTracksFilter',
    pure: false
})
export class NeedsEditingTracksFilter implements PipeTransform {
    transform(items: any[], args: any[]): any {
        // filter items array, items which match and return true will be kept, false will be filtered out
        return items.filter((item) => {
            var doesTrackStillNeedEditing = ( (item.file && item.file.name) || (item.validation && !item.validation.isTrackValid) ) ? true : false;
            return doesTrackStillNeedEditing;

        });
    }
}

@Pipe({
    name: 'approvedTracksFilter',
    pure: false
})
export class ApprovedTracksFilter implements PipeTransform {
    transform(items: any[], args: any[]): any {
        // filter items array, items which match and return true will be kept, false will be filtered out
        return items.filter((item) => {
            var isTrackReady =  (item.validation && item.validation.isTrackValid && (!item.releases || item.releases.length == 0) ) ? true : false;

            return isTrackReady;

        });
    }
}

@Pipe({
    name: 'approvedTracksAndTracksInReleasesFilter',
    pure: false
})
export class ApprovedTracksAndTracksInReleasesFilter implements PipeTransform {
    transform(items: any[], args: any[]): any {
        // filter items array, items which match and return true will be kept, false will be filtered out
        return items.filter((item) => {
            var isTrackReady =  (item.validation && item.validation.isTrackValid) ? true : false;

            return isTrackReady;

        });
    }
}

@Pipe({
    name: 'hasRelease',
    pure: false
})
export class HasRelease implements PipeTransform {
    transform(items: any[], args: any[]): any {
        // filter items array, items which match and return true will be kept, false will be filtered out
        return items.filter((item) => {
            var isTrackPartOfRelease =  (item.validation && item.validation.isTrackValid && item.releases && item.releases.length > 0) ? true : false;
            return isTrackPartOfRelease;

        });
    }
}

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
        return items.filter(item => item._id.indexOf(args[0]._id) !== -1);
    }
}

@Pipe({
    name: 'listLength',
    pure: false
})
export class ListLength implements PipeTransform {
    transform(items: any[], args: any[]): any {
        // filter items array, items which match and return true will be kept, false will be filtered out
        return items.length;
    }
}
