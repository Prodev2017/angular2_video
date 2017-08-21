import {FormGroup} from '@angular/forms';

export class IfHasLengthValidator {

  public static validate(firstField, secondField) {

    return (c:FormGroup) => {

      return (c.controls && (c.controls[firstField].value.length == 0 || c.controls[secondField].value.length == 0) || (c.controls[firstField].value.length >= 8 && c.controls[secondField].value.length >= 8) ) ? null : {
        ifHasLength: {
          valid: false
        }
      };
    }
  }
}
