import {AbstractControl} from '@angular/forms';

export class UrlValidator {

  public static validate(c:AbstractControl) {
    let URL_REGEXP = /^(https?:\/\/)?((([a-zd]([a-zd-]*[a-zd])*).)+[a-z]{2,}|((d{1,3}.){3}d{1,3}))(:d+)?(\/[-a-zd%_.~+]*)*(\?[;&a-zd%_.~+=-]*)?(#[-a-zd_]*)?$/i;

    return ( (c.value && c.value.length > 0 && URL_REGEXP.test(c.value)) || (!c.value) ) ? null : {
      validateUrl: {
        valid: false
      }
    };
  }
}
