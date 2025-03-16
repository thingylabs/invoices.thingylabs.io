// Function to generate XML
function generateXml() {
    const invoiceData = window.collectFormData();
    const xmlContent = generateXRechnung(invoiceData);
    
    // Create a download link for the XML file
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${invoiceData.invoiceNumber || 'new'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Function to generate XRechnung XML
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
    
    // Create XML structure for XRechnung
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.0</cbc:CustomizationID>
    <cbc:ID>${data.invoiceNumber}</cbc:ID>
    <cbc:IssueDate>${data.invoiceDate}</cbc:IssueDate>
    <cbc:DueDate>${data.invoiceDate}</cbc:DueDate>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>EUR</cbc:TaxCurrencyCode>
    ${data.reverseCharge ? '<cbc:TaxPointDate>' + data.invoiceDate + '</cbc:TaxPointDate>' : ''}
    ${data.reverseCharge ? '<cbc:Note>Reverse charge: VAT liability transfers to the recipient of this invoice</cbc:Note>' : ''}
    
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${data.companyName}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${data.companyAddress}</cbc:StreetName>
                <cbc:CityName></cbc:CityName>
                <cbc:PostalZone></cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>DE</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:Contact>
                <cbc:ElectronicMail>${data.companyEmail}</cbc:ElectronicMail>
                <cbc:Telephone>${data.companyPhone}</cbc:Telephone>
            </cac:Contact>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${data.companyTaxId}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${data.companyName}</cbc:RegistrationName>
                <cbc:CompanyID>${data.companyRegNumber}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${data.clientName}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${data.clientAddress}</cbc:StreetName>
                <cbc:CityName></cbc:CityName>
                <cbc:PostalZone></cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>${data.reverseCharge ? 'XX' : 'DE'}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${data.clientName}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
    
    <cac:Delivery>
        <cac:DeliveryPeriod>
            <cbc:StartDate>${data.deliveryDateStart}</cbc:StartDate>
            <cbc:EndDate>${data.deliveryDateEnd}</cbc:EndDate>
        </cac:DeliveryPeriod>
    </cac:Delivery>
    
    <cac:PaymentMeans>
        <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
        <cbc:PaymentID>${data.invoiceNumber}</cbc:PaymentID>
        <cac:PayeeFinancialAccount>
            <cbc:ID>${data.companyBankInfo}</cbc:ID>
        </cac:PayeeFinancialAccount>
    </cac:PaymentMeans>
    
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="EUR">${totalVat.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="EUR">${subtotal.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="EUR">${totalVat.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>${taxCategoryCode}</cbc:ID>
                <cbc:Percent>${data.reverseCharge ? '0' : '19'}</cbc:Percent>
                ${data.reverseCharge ? '<cbc:TaxExemptionReason>Reverse charge</cbc:TaxExemptionReason>' : ''}
                <cac:TaxScheme>
                    <cbc:ID>${taxTypeCode}</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="EUR">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="EUR">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="EUR">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="EUR">${total.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    
    ${data.lineItems.map((item, index) => {
        const lineTotal = item.quantity * item.price;
        return `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="EA">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="EUR">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>${item.description}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>${taxCategoryCode}</cbc:ID>
                <cbc:Percent>${item.vat}</cbc:Percent>
                ${data.reverseCharge ? '<cbc:TaxExemptionReason>Reverse charge</cbc:TaxExemptionReason>' : ''}
                <cac:TaxScheme>
                    <cbc:ID>${taxTypeCode}</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="EUR">${item.price.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
    }).join('')}
</ubl:Invoice>`;
    
    return xml;
}

// Make the function available globally
window.generateXml = generateXml;
