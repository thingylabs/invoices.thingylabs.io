// xml.js

document.addEventListener('DOMContentLoaded', function() {
    // Generate XML
    document.getElementById('generateXml').addEventListener('click', generateXml);
    
    // Load saved form data when page loads
    loadFormState();
    
    // Set up auto-save on form changes
    setupAutoSave();
});

// Function to set up auto-save for all form inputs
function setupAutoSave() {
    // Get all form inputs
    const formInputs = document.querySelectorAll('input, select, textarea');
    
    // Add change event listener to each input
    formInputs.forEach(input => {
        input.addEventListener('change', saveFormState);
        input.addEventListener('input', saveFormState);
    });
    
    // Also save when line items are added or removed
    const addLineItemButton = document.getElementById('addLineItem');
    if (addLineItemButton) {
        addLineItemButton.addEventListener('click', function() {
            // Wait a moment for the DOM to update
            setTimeout(saveFormState, 100);
        });
    }
    
    // Set up a listener for remove line item buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('removeLineItem')) {
            // Wait a moment for the DOM to update
            setTimeout(saveFormState, 100);
        }
    });
}

// Function to save the current form state to localStorage
function saveFormState() {
    const formData = collectFormData();
    localStorage.setItem('invoiceFormData', JSON.stringify(formData));
    console.log('Form state saved');
}

// Function to load the saved form state from localStorage
function loadFormState() {
    const savedData = localStorage.getItem('invoiceFormData');
    if (!savedData) return;
    
    try {
        const formData = JSON.parse(savedData);
        
        // Populate form fields with saved data
        populateFormFields(formData);
        
        console.log('Form state loaded');
    } catch (error) {
        console.error('Error loading saved form state:', error);
    }
}

// Function to populate form fields with saved data
function populateFormFields(data) {
    // Populate simple fields
    for (const key in data) {
        if (key === 'lineItems') continue; // Handle line items separately
        
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = data[key];
            } else {
                element.value = data[key];
            }
        }
    }
    
    // Handle line items
    if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
        // Clear any existing line items first (except the first template row)
        const lineItemsContainer = document.getElementById('lineItems');
        while (lineItemsContainer.children.length > 1) {
            lineItemsContainer.removeChild(lineItemsContainer.lastChild);
        }
        
        // Get the template row
        const templateRow = lineItemsContainer.children[0];
        
        // Clear the template row inputs
        const templateInputs = templateRow.querySelectorAll('input');
        templateInputs.forEach(input => {
            input.value = '';
        });
        
        // Add saved line items
        data.lineItems.forEach((item, index) => {
            let row;
            if (index === 0) {
                // Use the first row that already exists
                row = templateRow;
            } else {
                // Clone the template for additional rows
                row = templateRow.cloneNode(true);
                lineItemsContainer.appendChild(row);
                
                // Add event listener to the remove button
                const removeButton = row.querySelector('.removeLineItem');
                if (removeButton) {
                    removeButton.addEventListener('click', function() {
                        row.remove();
                        saveFormState();
                    });
                }
            }
            
            // Fill in the values
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 3) {
                inputs[0].value = item.description || '';
                inputs[1].value = item.quantity || '';
                inputs[2].value = item.price || '';
                if (inputs.length >= 4) {
                    inputs[3].value = item.vat || '';
                }
            }
        });
    }
}

// Function to collect all form data
function collectFormData() {
    const data = {
        // Invoice details
        invoiceNumber: document.getElementById('invoiceNumber')?.value || '',
        invoiceDate: document.getElementById('invoiceDate')?.value || '',
        
        // Company details
        companyName: document.getElementById('companyName')?.value || '',
        companyAddress: document.getElementById('companyAddress')?.value || '',
        companyEmail: document.getElementById('companyEmail')?.value || '',
        companyPhone: document.getElementById('companyPhone')?.value || '',
        companyTaxId: document.getElementById('companyTaxId')?.value || '',
        companyRegNumber: document.getElementById('companyRegNumber')?.value || '',
        companyBankInfo: document.getElementById('companyBankInfo')?.value || '',
        
        // Client details
        clientName: document.getElementById('clientName')?.value || '',
        clientAddress: document.getElementById('clientAddress')?.value || '',
        
        // Delivery details
        deliveryDateStart: document.getElementById('deliveryDateStart')?.value || '',
        deliveryDateEnd: document.getElementById('deliveryDateEnd')?.value || '',
        
        // Tax settings
        reverseCharge: document.getElementById('reverseCharge')?.checked || false,
        
        // Line items
        lineItems: []
    };
    
    // Collect line items
    const lineItemsContainer = document.getElementById('lineItems');
    if (lineItemsContainer) {
        const lineItemRows = lineItemsContainer.children;
        
        for (let i = 0; i < lineItemRows.length; i++) {
            const row = lineItemRows[i];
            const inputs = row.querySelectorAll('input');
            
            // Only add non-empty line items
            if (inputs.length >= 3 && (inputs[0].value.trim() || inputs[1].value.trim() || inputs[2].value.trim())) {
                data.lineItems.push({
                    description: inputs[0].value || '',
                    quantity: inputs[1].value || '',
                    price: inputs[2].value || '',
                    vat: inputs.length >= 4 ? (inputs[3].value || '') : '19' // Default VAT rate if not specified
                });
            }
        }
    }
    
    return data;
}

// Function to generate XML
function generateXml() {
    console.log("Generate XML button clicked");
    try {
        const invoiceData = collectFormData();
        console.log("Form data collected:", invoiceData);
        const xmlContent = generateXRechnung(invoiceData);
        console.log("XML generated successfully");
        
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
    } catch (error) {
        console.error("Error generating XML:", error);
        alert("Error generating XML: " + error.message);
    }
}

// Helper function to format dates properly for ZUGFeRD
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

// Function to generate ZUGFeRD-compliant XML
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
        const lineVat = lineTotal * (vat / 100);
        
        subtotal += lineTotal;
        totalVat += lineVat;
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
            <udt:DateTimeString format="102">${formatDate(data.invoiceDate)}</udt:DateTimeString>
        </ram:IssueDateTime>
        ${data.reverseCharge ? '<ram:IncludedNote><ram:Content>Reverse charge: VAT liability transfers to the recipient of this invoice</ram:Content></ram:IncludedNote>' : ''}
    </rsm:ExchangedDocument>
    
    <rsm:SupplyChainTradeTransaction>
        <!-- Line items -->
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
                <ram:Name>${item.description || ''}</ram:Name>
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
                    <ram:TypeCode>${taxTypeCode}</ram:TypeCode>
                    <ram:CategoryCode>${taxCategoryCode}</ram:CategoryCode>
                    <ram:RateApplicablePercent>${data.reverseCharge ? '0' : (parseFloat(item.vat) || 0)}</ram:RateApplicablePercent>
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
                    <udt:DateTimeString format="102">${formatDate(data.deliveryDateEnd)}</udt:DateTimeString>
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
                    <udt:DateTimeString format="102">${formatDate(data.invoiceDate)}</udt:DateTimeString>
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
