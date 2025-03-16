// xml.js

document.addEventListener('DOMContentLoaded', function() {
    // Generate XML
    document.getElementById('generateXml').addEventListener('click', generateXml);
    
    // Add event listeners for PDF and print buttons
    const generatePdfButton = document.getElementById('generatePdf');
    if (generatePdfButton) {
        generatePdfButton.addEventListener('click', generatePdf);
    }
    
    const printInvoiceButton = document.getElementById('printInvoice');
    if (printInvoiceButton) {
        printInvoiceButton.addEventListener('click', printInvoice);
    }
    
    // Set up add line item button
    const addLineItemButton = document.getElementById('addLineItem');
    if (addLineItemButton) {
        addLineItemButton.addEventListener('click', function() {
            addLineItem();
            setTimeout(function() {
                saveFormState();
                updatePreview();
            }, 100);
        });
    }
    
    // Load saved form data when page loads
    loadFormState();
    
    // Set up auto-save on form changes
    setupAutoSave();
    
    // Initial preview update
    updatePreview();
});

// Function to add a new line item
function addLineItem() {
    const lineItemsContainer = document.getElementById('lineItems');
    if (!lineItemsContainer) return;
    
    // Get the template row (first row)
    const templateRow = lineItemsContainer.children[0];
    if (!templateRow) return;
    
    // Clone the template
    const newRow = templateRow.cloneNode(true);
    
    // Clear input values in the new row
    const inputs = newRow.querySelectorAll('input');
    inputs.forEach(input => {
        input.value = '';
    });
    
    // Add event listener to the remove button
    const removeButton = newRow.querySelector('.removeLineItem');
    if (removeButton) {
        removeButton.addEventListener('click', function() {
            newRow.remove();
            saveFormState();
            updatePreview();
        });
    }
    
    // Add input event listeners for auto-save
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            saveFormState();
            updatePreview();
        });
        input.addEventListener('change', function() {
            saveFormState();
            updatePreview();
        });
    });
    
    // Add the new row to the container
    lineItemsContainer.appendChild(newRow);
}

// Function to set up auto-save for all form inputs
function setupAutoSave() {
    // Get all form inputs
    const formInputs = document.querySelectorAll('input, select, textarea');
    
    // Add change event listener to each input
    formInputs.forEach(input => {
        input.addEventListener('change', function() {
            saveFormState();
            updatePreview();
        });
        
        input.addEventListener('input', function() {
            saveFormState();
            updatePreview();
        });
    });
    
    // Set up a listener for remove line item buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('removeLineItem')) {
            // Wait a moment for the DOM to update
            setTimeout(function() {
                saveFormState();
                updatePreview();
            }, 100);
        }
    });
}

// Function to update the preview
function updatePreview() {
    const data = collectFormData();
    
    // Update invoice number and date in preview
    document.getElementById('previewInvoiceNumber').textContent = data.invoiceNumber || '';
    document.getElementById('previewInvoiceDate').textContent = data.invoiceDate || '';
    
    // Update company details in preview
    document.getElementById('previewCompanyName').textContent = data.companyName || '';
    document.getElementById('previewCompanyAddress').textContent = data.companyAddress || '';
    document.getElementById('previewCompanyContact').textContent = 
        `${data.companyEmail ? 'Email: ' + data.companyEmail : ''}
         ${data.companyPhone ? 'Phone: ' + data.companyPhone : ''}`.trim();
    document.getElementById('previewCompanyTaxInfo').textContent = 
        `${data.companyTaxId ? 'Tax ID: ' + data.companyTaxId : ''}
         ${data.companyRegNumber ? 'Reg #: ' + data.companyRegNumber : ''}`.trim();
    
    // Update client details in preview
    document.getElementById('previewClientName').textContent = data.clientName || '';
    document.getElementById('previewClientAddress').textContent = data.clientAddress || '';
    
    // Update delivery dates in preview
    const deliveryPeriod = [];
    if (data.deliveryDateStart) deliveryPeriod.push('From: ' + data.deliveryDateStart);
    if (data.deliveryDateEnd) deliveryPeriod.push('To: ' + data.deliveryDateEnd);
    document.getElementById('previewDeliveryPeriod').textContent = deliveryPeriod.join(' ');
    
    // Update line items in preview
    const lineItemsTable = document.getElementById('previewLineItems');
    if (!lineItemsTable) return;
    
    // Clear existing rows except header
    while (lineItemsTable.rows.length > 1) {
        lineItemsTable.deleteRow(1);
    }
    
    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;
    
    // Add line items to preview table
    data.lineItems.forEach(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const vat = parseFloat(item.vat) || 0;
        
        const lineTotal = quantity * price;
        const lineVat = lineTotal * (vat / 100);
        
        subtotal += lineTotal;
        totalVat += lineVat;
        
        const row = lineItemsTable.insertRow();
        
        // Description
        const cellDesc = row.insertCell();
        cellDesc.textContent = item.description;
        
        // Quantity
        const cellQty = row.insertCell();
        cellQty.textContent = quantity;
        cellQty.className = 'text-right';
        
        // Price
        const cellPrice = row.insertCell();
        cellPrice.textContent = price.toFixed(2) + ' €';
        cellPrice.className = 'text-right';
        
        // VAT
        const cellVat = row.insertCell();
        cellVat.textContent = vat + '%';
        cellVat.className = 'text-right';
        
        // Line total
        const cellTotal = row.insertCell();
        cellTotal.textContent = lineTotal.toFixed(2) + ' €';
        cellTotal.className = 'text-right';
    });
    
    // Update totals in preview
    const total = subtotal + totalVat;
    document.getElementById('previewSubtotal').textContent = subtotal.toFixed(2) + ' €';
    document.getElementById('previewVat').textContent = totalVat.toFixed(2) + ' €';
    document.getElementById('previewTotal').textContent = total.toFixed(2) + ' €';
    
    // Update bank info in preview
    document.getElementById('previewBankInfo').textContent = data.companyBankInfo || '';
    
    // Update reverse charge notice if applicable
    const reverseChargeNotice = document.getElementById('reverseChargeNotice');
    if (reverseChargeNotice) {
        reverseChargeNotice.style.display = data.reverseCharge ? 'block' : 'none';
    }
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
    if (!savedData) {
        // If no saved data, ensure we have just one empty line item row
        ensureSingleEmptyLineItem();
        return;
    }
    
    try {
        const formData = JSON.parse(savedData);
        
        // Populate form fields with saved data
        populateFormFields(formData);
        
        // Update the preview with the loaded data
        updatePreview();
        
        console.log('Form state loaded');
    } catch (error) {
        console.error('Error loading saved form state:', error);
        ensureSingleEmptyLineItem();
    }
}

// Function to ensure there's exactly one empty line item row
function ensureSingleEmptyLineItem() {
    const lineItemsContainer = document.getElementById('lineItems');
    if (!lineItemsContainer) return;
    
    // Keep only the first row
    while (lineItemsContainer.children.length > 1) {
        lineItemsContainer.removeChild(lineItemsContainer.lastChild);
    }
    
    // Clear the first row's inputs
    if (lineItemsContainer.children.length > 0) {
        const firstRow = lineItemsContainer.children[0];
        const inputs = firstRow.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
        });
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
    const lineItemsContainer = document.getElementById('lineItems');
    if (!lineItemsContainer) return;
    
    // Clear all existing line items
    while (lineItemsContainer.children.length > 0) {
        lineItemsContainer.removeChild(lineItemsContainer.lastChild);
    }
    
    // If we have saved line items, add them
    if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
        // Get the template row from the DOM or create one if needed
        let templateRow;
        if (lineItemsContainer.children.length > 0) {
            templateRow = lineItemsContainer.children[0];
        } else {
            // If no template exists, we need to create one
            // This is a fallback and might need adjustment based on your HTML structure
            templateRow = document.createElement('div');
            templateRow.className = 'line-item row mb-2';
            templateRow.innerHTML = `
                <div class="col-5">
                    <input type="text" class="form-control" placeholder="Description">
                </div>
                <div class="col-2">
                    <input type="number" class="form-control" placeholder="Qty">
                </div>
                <div class="col-2">
                    <input type="number" class="form-control" placeholder="Price">
                </div>
                <div class="col-2">
                    <input type="number" class="form-control" placeholder="VAT %">
                </div>
                <div class="col-1">
                    <button type="button" class="btn btn-danger removeLineItem">×</button>
                </div>
            `;
        }
        
        // Add each line item
        data.lineItems.forEach(item => {
            // Clone the template
            const row = templateRow.cloneNode(true);
            
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
            
            // Add event listener to the remove button
            const removeButton = row.querySelector('.removeLineItem');
            if (removeButton) {
                removeButton.addEventListener('click', function() {
                    row.remove();
                    saveFormState();
                    updatePreview();
                });
            }
            
            // Add input event listeners
            inputs.forEach(input => {
                input.addEventListener('input', function() {
                    saveFormState();
                    updatePreview();
                });
                input.addEventListener('change', function() {
                    saveFormState();
                    updatePreview();
                });
            });
            
            // Add the row to the container
            lineItemsContainer.appendChild(row);
        });
    } else {
        // If no saved line items, add one empty row
        ensureSingleEmptyLineItem();
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
                    vat: inputs.length >= 4 ? (inputs[3].value || '19') : '19' // Default VAT rate if not specified
                });
            }
        }
    }
    
    return data;
}

// Function to generate PDF
function generatePdf() {
    // Make sure the preview is up to date
    updatePreview();
    
    // Get the invoice preview element
    const element = document.getElementById('invoicePreview');
    
    // Configure html2pdf options
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `Invoice-${document.getElementById('invoiceNumber').value || 'new'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate PDF
    html2pdf().set(opt).from(element).save();
}

// Function to print the invoice
function printInvoice() {
    // Make sure the preview is up to date
    updatePreview();
    
    // Print the invoice preview
    window.print();
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
    
    // Format the current date for document creation
    const now = new Date();
    const formattedNow = now.toISOString().split('T')[0].replace(/-/g, '');
    
    // Create XML structure for ZUGFeRD 2.3.2 (CrossIndustryInvoice format)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                         xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                         xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
                         xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p3p2:extended</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
        <ram:BusinessProcessSpecifiedDocumentContextParameter>
            <ram:ID>urn:zugferd.de:2p3p2:comfort</ram:ID>
        </ram:BusinessProcessSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    
    <rsm:ExchangedDocument>
        <ram:ID>${data.invoiceNumber}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">${formatDate(data.invoiceDate)}</udt:DateTimeString>
        </ram:IssueDateTime>
        ${data.reverseCharge ? '<ram:IncludedNote><ram:Content>Reverse charge: VAT liability transfers to the recipient of this invoice</ram:Content><ram:SubjectCode>AAI</ram:SubjectCode></ram:IncludedNote>' : ''}
        <ram:LanguageID>de</ram:LanguageID>
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
                    <ram:BasisQuantity unitCode="C62">1</ram:BasisQuantity>
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
            <ram:BuyerReference>${data.invoiceNumber}</ram:BuyerReference>
            <ram:SellerTradeParty>
                <ram:ID>${data.companyRegNumber}</ram:ID>
                <ram:Name>${data.companyName}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode></ram:PostcodeCode>
                    <ram:LineOne>${data.companyAddress}</ram:LineOne>
                    <ram:CityName></ram:CityName>
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
                    <ram:PostcodeCode></ram:PostcodeCode>
                    <ram:LineOne>${data.clientAddress}</ram:LineOne>
                    <ram:CityName></ram:CityName>
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
                <ram:Information>Überweisung</ram:Information>
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
