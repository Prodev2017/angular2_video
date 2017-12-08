import {FormGroup} from '@angular/forms';

export class TaxIdValidator {

  public static validate(address, taxId) {

    return (c:FormGroup) => {
console.log(c.controls[address],c.controls[taxId], typeof c.controls[taxId].value, JSON.stringify(c.controls[taxId].value));
      if(c.controls && c.controls[address].value.country == "United States" && ( ( typeof c.controls[taxId].value == "boolean" && c.controls[taxId].value === true) || (typeof c.controls[taxId].value != "boolean" && c.controls[taxId].value != null) ) ) {
        console.log('in us and valid tax id value')
        return null;
        
      } else if (c.controls && c.controls[address].value.country != "United States") {
                console.log('not in us')

        return null;
        
      } else {
                        console.log('in us but missing tax id')

        return { taxInformation: {
          valid: false 
        }, taxId: {
          valid: false
        }

    };
    }
  }
}
}