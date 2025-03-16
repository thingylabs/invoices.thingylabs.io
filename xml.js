function generateXRechnung(data) {
    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;
    
    data.lineItems.forEach(item => {
        const itemTotal = item.quantity * item.price;
        const itemVat = itemTotal * (item.vat / 100);
        
        subtotal += itemTotal;
        totalVat += itemVat;
    });
    
    const total = subtotal + totalVat;
    
    // Tax category code - S for standard rate, Z for zero rate (reverse charge)
    const taxCategoryCode = data.reverseCharge ? 'Z' : 'S';
    const taxTypeCode = data.reverseCharge ? 'AE' : 'VAT'; // AE = VAT Reverse Charge
    
    // Create XML structure for ZUGFeRD (CrossIndustryInvoice format)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                         xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                         xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:extended</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    
    <rsm:ExchangedDocument>
        <ram:ID>${data.invoiceNumber}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">${data.invoiceDate.replace(/-/g, '')}</udt:DateTimeString>
        </ram:IssueDateTime>
        ${data.reverseCharge ? '<ram:IncludedNote><ram:Content>Reverse charge: VAT liability transfers to the recipient of this invoice</ram:Content></ram:IncludedNote>' : ''}
    </rsm:ExchangedDocument>
    
    <rsm:SupplyChainTradeTransaction>
        <!-- Line items -->
        ${data.lineItems.map((item, index) => {
            const lineTotal = item.quantity * item.price;
            return `
        <ram:IncludedSupplyChainTradeLineItem>
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>${index + 1}</ram:LineID>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>${item.description}</ram:Name>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>${item.price.toFixed(2)}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity unitCode="C62">${item.quantity}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>${taxTypeCode}</ram:TypeCode>
                    <ram:CategoryCode>${taxCategoryCode}</ram:CategoryCode>
                    <ram:RateApplicablePercent>${data.reverseCharge ? '0' : item.vat}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>${lineTotal.toFixed(2)}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>
        </ram:IncludedSupplyChainTradeLineItem>`;
        }).join('')}
        
        <!-- Header level information -->
        <ram:ApplicableHeaderTradeAgreement>
            <ram:SellerTradeParty>
                <ram:Name>${data.companyName}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:LineOne>${data.companyAddress}</ram:LineOne>
                    <ram:CountryID>DE</ram:CountryID>
                </ram:PostalTradeAddress>
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="VA">${data.companyTaxId}</ram:ID>
                </ram:SpecifiedTaxRegistration>
                <ram:SpecifiedLegalOrganization>
                    <ram:ID schemeID="0021">${data.companyRegNumber}</ram:ID>
                </ram:SpecifiedLegalOrganization>
                <ram:DefinedTradeContact>
                    <ram:EmailURIUniversalCommunication>
                        <ram:URIID>${data.companyEmail}</ram:URIID>
                    </ram:EmailURIUniversalCommunication>
                    <ram:TelephoneUniversalCommunication>
                        <ram:CompleteNumber>${data.companyPhone}</ram:CompleteNumber>
                    </ram:TelephoneUniversalCommunication>
                </ram:DefinedTradeContact>
            </ram:SellerTradeParty>
            
            <ram:BuyerTradeParty>
                <ram:Name>${data.clientName}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:LineOne>${data.clientAddress}</ram:LineOne>
                    <ram:CountryID>${data.reverseCharge ? 'XX' : 'DE'}</ram:CountryID>
                </ram:PostalTradeAddress>
            </ram:BuyerTradeParty>
        </ram:ApplicableHeaderTradeAgreement>
        
        <ram:ApplicableHeaderTradeDelivery>
            <ram:ActualDeliverySupplyChainEvent>
                <ram:OccurrenceDateTime>
                    <udt:DateTimeString format="102">${data.deliveryDateEnd.replace(/-/g, '')}</udt:DateTimeString>
                </ram:OccurrenceDateTime>
            </ram:ActualDeliverySupplyChainEvent>
        </ram:ApplicableHeaderTradeDelivery>
        
        <ram:ApplicableHeaderTradeSettlement>
            <ram:PaymentReference>${data.invoiceNumber}</ram:PaymentReference>
            <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
            
            <ram:SpecifiedTradeSettlementPaymentMeans>
                <ram:TypeCode>58</ram:TypeCode>
                <ram:PayeePartyCreditorFinancialAccount>
                    <ram:IBANID>${data.companyBankInfo}</ram:IBANID>
                </ram:PayeePartyCreditorFinancialAccount>
            </ram:SpecifiedTradeSettlementPaymentMeans>
            
            <ram:ApplicableTradeTax>
                <ram:CalculatedAmount>${totalVat.toFixed(2)}</ram:CalculatedAmount>
                <ram:TypeCode>${taxTypeCode}</ram:TypeCode>
                <ram:BasisAmount>${subtotal.toFixed(2)}</ram:BasisAmount>
                <ram:CategoryCode>${taxCategoryCode}</ram:CategoryCode>
                <ram:RateApplicablePercent>${data.reverseCharge ? '0' : '19'}</ram:RateApplicablePercent>
                ${data.reverseCharge ? '<ram:ExemptionReason>Reverse charge</ram:ExemptionReason>' : ''}
            </ram:ApplicableTradeTax>
            
            <ram:SpecifiedTradePaymentTerms>
                <ram:DueDateDateTime>
                    <udt:DateTimeString format="102">${data.invoiceDate.replace(/-/g, '')}</udt:DateTimeString>
                </ram:DueDateDateTime>
            </ram:SpecifiedTradePaymentTerms>
            
            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                <ram:LineTotalAmount>${subtotal.toFixed(2)}</ram:LineTotalAmount>
                <ram:TaxBasisTotalAmount>${subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
                <ram:TaxTotalAmount currencyID="EUR">${totalVat.toFixed(2)}</ram:TaxTotalAmount>
                <ram:GrandTotalAmount>${total.toFixed(2)}</ram:GrandTotalAmount>
                <ram:DuePayableAmount>${total.toFixed(2)}</ram:DuePayableAmount>
            </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        </ram:ApplicableHeaderTradeSettlement>
    </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
    
    return xml;
}
