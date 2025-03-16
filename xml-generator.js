// xml-generator.js - New file for XML generation functionality

/**
 * Generates XRechnung 3.0.2 compliant XML from invoice data
 * @param {Object} data - The invoice data
 * @returns {string} - The generated XML content
 */
function generateXRechnung(data) {
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
    
    // Tax category code - S for standard rate, Z for zero rate (reverse charge)
    const taxCategoryCode = data.reverseCharge ? 'Z' : 'S';
    
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
    
    const invoiceDate = formatXmlDate(data.invoiceDate);
    const deliveryStartDate = formatXmlDate(data.deliveryDateStart);
    const deliveryEndDate = formatXmlDate(data.deliveryDateEnd);
    
    // Extract postal code, city, and street from addresses
    const extractAddressParts = (address) => {
        const lines = address.split('\n').map(line => line.trim()).filter(line => line);
        let postalCode = '';
        let city = '';
        let street = '';
        
        if (lines.length >= 1) street = lines[0];
        
        // Try to extract postal code and city from the second line
        if (lines.length >= 2) {
            const match = lines[1].match(/(\d{5})\s+(.+)/);
            if (match) {
                postalCode = match[1];
                city = match[2];
            } else {
                city = lines[1];
            }
        }
        
        return { postalCode, city, street };
    };
    
    const companyAddressParts = extractAddressParts(data.companyAddress);
    const clientAddressParts = extractAddressParts(data.clientAddress);
    
    // Extract bank information
    const bankInfo = data.companyBankInfo.split('\n').map(line => line.trim()).filter(line => line);
    const bankAccount = bankInfo.length > 0 ? bankInfo[0] : '';
    
    // Split representative name into first and last name
    const nameParts = data.companyRepresentative.split(' ');
    const firstName = nameParts.length > 0 ? nameParts[0] : '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Create XML structure for XRechnung 3.0.2
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    
    <!-- BT-24 Specification identifier -->
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</cbc:CustomizationID>
    
    <!-- BT-23 Business process type -->
    <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
    
    <!-- BT-1 Invoice number -->
    <cbc:ID>${data.invoiceNumber}</cbc:ID>
    
    <!-- BT-2 Invoice issue date -->
    <cbc:IssueDate>${invoiceDate}</cbc:IssueDate>
    
    <!-- BT-3 Invoice type code -->
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    
    <!-- BT-22 Invoice note -->
    <cbc:Note>${data.reverseCharge ? 'Reverse charge: VAT liability transfers to the recipient of this invoice' : ''}</cbc:Note>
    
    <!-- BT-7 Tax point date -->
    <cbc:TaxPointDate>${invoiceDate}</cbc:TaxPointDate>
    
    <!-- BT-5 Invoice currency code -->
    <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
    
    <!-- BT-6 VAT accounting currency code -->
    <cbc:TaxCurrencyCode>EUR</cbc:TaxCurrencyCode>
    
    <!-- BT-19 Buyer accounting reference -->
    <cbc:AccountingCost>${data.invoiceNumber}</cbc:AccountingCost>
    
    <!-- BG-1 Invoice period -->
    <cac:InvoicePeriod>
        ${deliveryStartDate ? `<cbc:StartDate>${deliveryStartDate}</cbc:StartDate>` : ''}
        ${deliveryEndDate ? `<cbc:EndDate>${deliveryEndDate}</cbc:EndDate>` : ''}
    </cac:InvoicePeriod>
    
    <!-- BG-24 Additional supporting documents -->
    <cac:AdditionalDocumentReference>
        <cbc:ID>Invoice-${data.invoiceNumber}</cbc:ID>
        <cbc:DocumentTypeCode>130</cbc:DocumentTypeCode>
        <cbc:DocumentDescription>Invoice document</cbc:DocumentDescription>
    </cac:AdditionalDocumentReference>
    
    <!-- BG-2 Process control -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <!-- BT-29 Seller identifier -->
            <cbc:EndpointID schemeID="0088">${data.companyRegNumber}</cbc:EndpointID>
            
            <cac:PartyIdentification>
                <cbc:ID>${data.companyRegNumber}</cbc:ID>
            </cac:PartyIdentification>
            
            <cac:PartyName>
                <cbc:Name>${data.companyName}</cbc:Name>
            </cac:PartyName>
            
            <!-- BG-5 Seller postal address -->
            <cac:PostalAddress>
                <cbc:StreetName>${companyAddressParts.street}</cbc:StreetName>
                <cbc:CityName>${companyAddressParts.city}</cbc:CityName>
                <cbc:PostalZone>${companyAddressParts.postalCode}</cbc:PostalZone>
                <cbc:CountrySubentity></cbc:CountrySubentity>
                <cac:Country>
                    <cbc:IdentificationCode>DE</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            
            <!-- BG-6 Seller contact -->
            <cac:Contact>
                <cbc:Name>Contact</cbc:Name>
                <cbc:Telephone>${data.companyPhone}</cbc:Telephone>
                <cbc:ElectronicMail>${data.companyEmail}</cbc:ElectronicMail>
            </cac:Contact>
            
            <!-- BG-4 Seller tax information -->
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
            
            <cac:Person>
                <cbc:FirstName>${firstName}</cbc:FirstName>
                <cbc:FamilyName>${lastName}</cbc:FamilyName>
            </cac:Person>
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <!-- BG-7 Buyer -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID>Client-${data.invoiceNumber}</cbc:ID>
            </cac:PartyIdentification>
            
            <cac:PartyName>
                <cbc:Name>${data.clientName}</cbc:Name>
            </cac:PartyName>
            
            <!-- BG-8 Buyer postal address -->
            <cac:PostalAddress>
                <cbc:StreetName>${clientAddressParts.street}</cbc:StreetName>
                <cbc:CityName>${clientAddressParts.city}</cbc:CityName>
                <cbc:PostalZone>${clientAddressParts.postalCode}</cbc:PostalZone>
                <cbc:CountrySubentity></cbc:CountrySubentity>
                <cac:Country>
                    <cbc:IdentificationCode>${data.reverseCharge ? 'XX' : 'DE'}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            
            <cac:Contact>
                <cbc:Name>Contact</cbc:Name>
            </cac:Contact>
            
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${data.clientName}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
            
            <!-- Add Person element instead of PartyTaxScheme -->
            <cac:Person>
                <cbc:FirstName>Contact</cbc:FirstName>
                <cbc:FamilyName>Person</cbc:FamilyName>
            </cac:Person>
        </cac:Party>
    </cac:AccountingCustomerParty>
    
    <!-- BG-16 Payment instructions -->
    <cac:PaymentMeans>
        <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
        <cbc:PaymentID>${data.invoiceNumber}</cbc:PaymentID>
        <cac:PayeeFinancialAccount>
            <cbc:ID>${bankAccount}</cbc:ID>
            <cbc:Name>${data.companyName} Account</cbc:Name>
        </cac:PayeeFinancialAccount>
    </cac:PaymentMeans>
    
    <!-- BG-22 Document totals -->
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
                    <cbc:ID>VAT</cbc:ID>
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
    
    <!-- BG-25 Invoice lines -->
    ${data.lineItems.map((item, index) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const lineTotal = quantity * price;
        return `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="C62">${quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="EUR">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
        
        <cac:Item>
            <cbc:Description>${item.description || ''}</cbc:Description>
            <cbc:Name>${item.description || 'Item'}</cbc:Name>
            
            <cac:ClassifiedTaxCategory>
                <cbc:ID>${taxCategoryCode}</cbc:ID>
                <cbc:Percent>${data.reverseCharge ? '0' : (parseFloat(item.vat) || 0)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        
        <cac:Price>
            <cbc:PriceAmount currencyID="EUR">${price.toFixed(2)}</cbc:PriceAmount>
            <cbc:BaseQuantity unitCode="C62">1</cbc:BaseQuantity>
        </cac:Price>
    </cac:InvoiceLine>`;
    }).join('')}
</ubl:Invoice>`;
    
    return xml;
}

/**
 * Helper function to format dates properly for ZUGFeRD
 * @param {string} dateString - The date string to format
 * @returns {string} - The formatted date
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    // Remove any non-digit characters and ensure we have 8 digits (YYYYMMDD)
    const digits = dateString.replace(/\D/g, '');
    if (digits.length === 8) return digits;
    
    // If the input is in YYYY-MM-DD format
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return parts.join('');
    }
    
    // Default fallback - just return the original with non-digits removed
    return digits;
}

// Export the functions
export { generateXRechnung, formatDate };
