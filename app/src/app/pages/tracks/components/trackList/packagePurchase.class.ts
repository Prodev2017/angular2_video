export class PackagePurchase {

  constructor(
    public selectedPackageId:string,
    public selectedPackageCurrencyId:string,
    public cardNumber:string = null,
    public cardExpMonth:number = null,
    public cardExpYear:number = null,
    public expiryMonth:number = null,
    public expiryYear:number = null,
    public cardCVV:number = null,
    public cardName:string = null,
    public cardZIP:string = null
  ) { }

}