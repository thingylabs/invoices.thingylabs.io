/**
 * Generates ZUGFeRD 2.3.2 Extended compliant XML from invoice data
 * @param {Object} data - The invoice data
 * @returns {string} - The generated XML content
 */
function generateZugferd(data) {
    // Ensure data object has all required properties
    data = {
        invoiceNumber: '',
        invoiceDate: '',
        companyName: '',
        companyAddress: '',
        companyEmail: '',
        companyPhone: '',
        companyTaxId: '',
        companyRegNumber: '',
        companyBankInfo: '',
        companyRepresentative: '',
        clientName: '',
        clientAddress: '',
        deliveryDateStart: '',
        deliveryDateEnd: '',
        reverseCharge: false,
        lineItems: [],
        ...data // Overwrite defaults with actual data
    };
    
    // Ensure lineItems is an array
    if (!Array.isArray(data.lineItems)) {
        data.lineItems = [];
    }
    
    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;
    
    data.lineItems.forEach(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const vat = parseFloat(item.vat) || 0;
        
        const lineTotal = quantity * price;
        const lineVat = data.reverseCharge ? 0 : (lineTotal * (vat / 100));
        
        subtotal += lineTotal;
        totalVat += lineVat;
    });
    
    const total = subtotal + totalVat;
    
    // Format dates correctly for XML (YYYY-MM-DD)
    const formatXmlDate = (dateString) => {
        if (!dateString) return '';
        
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        
        // Try to parse and format the date
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };
    
    const invoiceDate = formatXmlDate(data.invoiceDate) || formatXmlDate(new Date().toISOString());
    const deliveryStartDate = formatXmlDate(data.deliveryDateStart);
    const deliveryEndDate = formatXmlDate(data.deliveryDateEnd);
    const dueDate = formatXmlDate(data.dueDate);
    
    // Extract postal code, city, and street from addresses
    const extractAddressParts = (address) => {
        const lines = address.split('\n').map(line => line.trim()).filter(line => line);
        let postalCode = '00000'; // Default value
        let city = 'Unknown City'; // Default value
        let street = 'Unknown Street'; // Default value
        let country = 'DE'; // Default to Germany
        
        if (lines.length >= 1) street = lines[0] || street;
        
        // Try to extract postal code and city from the second line
        if (lines.length >= 2) {
            const match = lines[1].match(/(\d{5})\s+(.+)/);
            if (match) {
                postalCode = match[1];
                city = match[2];
            } else {
                city = lines[1] || city;
            }
        }
        
        // Check if there's a country in the last line
        if (lines.length >= 3) {
            if (lines[lines.length-1].trim().toLowerCase() !== 'germany') {
                country = lines[lines.length-1].trim() || country;
            }
        }
        
        return { postalCode, city, street, country };
    };
    
    const companyAddressParts = extractAddressParts(data.companyAddress);
    const clientAddressParts = extractAddressParts(data.clientAddress);
    
    // Extract bank information
    const bankInfo = data.companyBankInfo.split('\n').map(line => line.trim()).filter(line => line);
    const bankAccount = bankInfo.length > 0 ? bankInfo[0] : '';
    const bankBIC = bankInfo.length > 1 ? bankInfo[1] : '';
    
    // Ensure we have a valid invoice number (BR-02)
    const invoiceNumber = data.invoiceNumber ? data.invoiceNumber.trim() : `INV-${Date.now()}`;
    
    // Ensure we have a valid buyer name (BR-07)
    const buyerName = data.clientName ? data.clientName.trim() : "Unknown Buyer";
    
    // Create XML structure for ZUGFeRD 2.3.2 Extended
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                         xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                         xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
    
    <!-- HEADER -->
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:factur-x.eu:1p0:extended</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    
    <rsm:ExchangedDocument>
        <ram:ID>${invoiceNumber}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">${invoiceDate.replace(/-/g, '')}</udt:DateTimeString>
        </ram:IssueDateTime>
        ${data.notes ? `<ram:IncludedNote>
            <ram:Content>${data.notes}</ram:Content>
        </ram:IncludedNote>` : ''}
        ${data.reverseCharge ? `<ram:IncludedNote>
            <ram:Content>Reverse charge: VAT liability transfers to the recipient of this invoice</ram:Content>
        </ram:IncludedNote>` : ''}
    </rsm:ExchangedDocument>
    
    <rsm:SupplyChainTradeTransaction>
        
        <!-- ITEM INFORMATION -->
        ${data.lineItems.map((item, index) => {
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const lineTotal = quantity * price;
            return `
        <ram:IncludedSupplyChainTradeLineItem>
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>${index + 1}</ram:LineID>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>${item.description || 'Item'}</ram:Name>
                <ram:Description>${item.description || ''}</ram:Description>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>${price.toFixed(2)}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity unitCode="C62">${quantity}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>VAT</ram:TypeCode>
                    <ram:CategoryCode>${data.reverseCharge ? 'AE' : 'S'}</ram:CategoryCode>
                    <ram:RateApplicablePercent>${data.reverseCharge ? '0' : (parseFloat(item.vat) || 0)}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>${lineTotal.toFixed(2)}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>
        </ram:IncludedSupplyChainTradeLineItem>`;
        }).join('')}
        
        <!-- SELLER INFORMATION -->
        <ram:ApplicableHeaderTradeAgreement>
            <ram:SellerTradeParty>
                <ram:Name>${data.companyName || 'Seller Company'}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>${companyAddressParts.postalCode}</ram:PostcodeCode>
                    <ram:LineOne>${companyAddressParts.street}</ram:LineOne>
                    <ram:CityName>${companyAddressParts.city}</ram:CityName>
                    <ram:CountryID>DE</ram:CountryID>
                </ram:PostalTradeAddress>
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="VA">${data.companyTaxId || 'DE000000000'}</ram:ID>
                </ram:SpecifiedTaxRegistration>
            </ram:SellerTradeParty>
            
            <!-- BUYER INFORMATION -->
            <ram:BuyerTradeParty>
                <ram:Name>${buyerName}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>${clientAddressParts.postalCode}</ram:PostcodeCode>
                    <ram:LineOne>${clientAddressParts.street}</ram:LineOne>
                    <ram:CityName>${clientAddressParts.city}</ram:CityName>
                    <ram:CountryID>${data.reverseCharge ? clientAddressParts.country : 'DE'}</ram:CountryID>
                </ram:PostalTradeAddress>
            </ram:BuyerTradeParty>
        </ram:ApplicableHeaderTradeAgreement>
        
        <!-- DELIVERY INFORMATION -->
        <ram:ApplicableHeaderTradeDelivery>
            ${deliveryStartDate && deliveryEndDate ? `
            <ram:ActualDeliverySupplyChainEvent>
                <ram:OccurrenceDateTime>
                    <udt:DateTimeString format="102">${deliveryStartDate.replace(/-/g, '')}</udt:DateTimeString>
                </ram:OccurrenceDateTime>
            </ram:ActualDeliverySupplyChainEvent>` : ''}
        </ram:ApplicableHeaderTradeDelivery>
        
        <!-- PAYMENT INFORMATION -->
        <ram:ApplicableHeaderTradeSettlement>
            <ram:PaymentReference>${invoiceNumber}</ram:PaymentReference>
            <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
            
            ${bankAccount ? `
            <ram:SpecifiedTradeSettlementPaymentMeans>
                <ram:TypeCode>58</ram:TypeCode>
                <ram:PayeePartyCreditorFinancialAccount>
                    <ram:IBANID>${bankAccount}</ram:IBANID>
                </ram:PayeePartyCreditorFinancialAccount>
                ${bankBIC ? `
                <ram:PayeeSpecifiedCreditorFinancialInstitution>
                    <ram:BICID>${bankBIC}</ram:BICID>
                </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
            </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
            
            <!-- PAYMENT TERMS (BT-20) -->
            ${data.paymentTerms ? `
            <ram:SpecifiedTradePaymentTerms>
                <ram:Description>${data.paymentTerms} days</ram:Description>
            </ram:SpecifiedTradePaymentTerms>` : ''}
            
            <!-- DUE DATE (BT-9) -->
            ${dueDate ? `
            <ram:SpecifiedTradePaymentTerms>
                <ram:DueDateDateTime>
                    <udt:DateTimeString format="102">${dueDate.replace(/-/g, '')}</udt:DateTimeString>
                </ram:DueDateDateTime>
            </ram:SpecifiedTradePaymentTerms>` : ''}
            
            <!-- TAX INFORMATION -->
            <ram:ApplicableTradeTax>
                <ram:CalculatedAmount>${totalVat.toFixed(2)}</ram:CalculatedAmount>
                <ram:TypeCode>VAT</ram:TypeCode>
                <ram:BasisAmount>${subtotal.toFixed(2)}</ram:BasisAmount>
                <ram:CategoryCode>${data.reverseCharge ? 'AE' : 'S'}</ram:CategoryCode>
                <ram:RateApplicablePercent>${data.reverseCharge ? '0' : '19'}</ram:RateApplicablePercent>
                ${data.reverseCharge ? '<ram:ExemptionReason>Reverse charge</ram:ExemptionReason>' : ''}
            </ram:ApplicableTradeTax>
            
            <!-- TOTALS -->
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
