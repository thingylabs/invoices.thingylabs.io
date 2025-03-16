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
    const container = document.getElementById('lineItemsContainer');
    if (!container) return;
    
    const newItem = document.createElement('div');
    newItem.className = 'line-item';
    newItem.innerHTML = `
        <input type="text" placeholder="Description" class="item-description">
        <input type="number" placeholder="Quantity" class="item-quantity" min="1" value="1">
        <input type="number" placeholder="Price" class="item-price" min="0" step="0.01">
        <input type="number" placeholder="VAT %" class="item-vat" min="0" value="19">
        <button type="button" class="remove-item">✕</button>
    `;
    
    // Add event listeners to inputs for auto-save
    const inputs = newItem.querySelectorAll('input');
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
    
    // Add event listener to remove button
    const removeButton = newItem.querySelector('.remove-item');
    if (removeButton) {
        removeButton.addEventListener('click', function() {
            newItem.remove();
            saveFormState();
            updatePreview();
        });
    }
    
    container.appendChild(newItem);
    
    // Update the form state and preview
    saveFormState();
    updatePreview();
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
    const preview = document.getElementById('invoicePreview');
    
    if (!preview) {
        console.error('Invoice preview element not found');
        return;
    }
    
    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;
    
    data.lineItems.forEach(item => {
        const itemTotal = item.quantity * item.price;
        const itemVat = data.reverseCharge ? 0 : (itemTotal * (item.vat / 100));
        
        subtotal += itemTotal;
        totalVat += itemVat;
    });
    
    const total = subtotal + totalVat;
    
    // Format the payment terms note
    let paymentNote = '';
    if (data.paymentTerms && data.dueDate) {
        const formattedDueDate = new Date(data.dueDate).toLocaleDateString('en-GB');
        paymentNote = `Payment within ${data.paymentTerms} days. Due date: ${formattedDueDate}`;
    }
    
    // Generate HTML for the preview
    preview.innerHTML = `
        <div class="invoice-header">
            <div class="company-info">
                <h2>${data.companyName}</h2>
                <p>${data.companyAddress.replace(/\n/g, '<br>')}</p>
                <p>Email: ${data.companyEmail}</p>
                <p>Phone: ${data.companyPhone}</p>
                <p>VAT: ${data.companyTaxId}</p>
                <p>Reg: ${data.companyRegNumber}</p>
            </div>
            <div class="invoice-details">
                <h1>INVOICE</h1>
                <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
                <p><strong>Date:</strong> ${data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-GB') : ''}</p>
                ${data.dueDate ? `<p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString('en-GB')}</p>` : ''}
                ${data.deliveryDateStart && data.deliveryDateEnd ? 
                    `<p><strong>Service Period:</strong> ${new Date(data.deliveryDateStart).toLocaleDateString('en-GB')} - ${new Date(data.deliveryDateEnd).toLocaleDateString('en-GB')}</p>` : ''}
            </div>
        </div>
        
        <div class="client-section">
            <h3>Bill To:</h3>
            <p><strong>${data.clientName}</strong></p>
            <p>${data.clientAddress.replace(/\n/g, '<br>')}</p>
        </div>
        
        <table class="invoice-items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>VAT</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${data.lineItems.map(item => {
                    const itemTotal = item.quantity * item.price;
                    return `
                    <tr>
                        <td>${item.description}</td>
                        <td>${item.quantity}</td>
                        <td>€${item.price.toFixed(2)}</td>
                        <td>${data.reverseCharge ? 'RC' : item.vat + '%'}</td>
                        <td>€${itemTotal.toFixed(2)}</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" class="text-right"><strong>Subtotal:</strong></td>
                    <td>€${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="4" class="text-right"><strong>VAT:</strong></td>
                    <td>€${totalVat.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="4" class="text-right"><strong>Total:</strong></td>
                    <td>€${total.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
        
        <div class="invoice-footer">
            ${data.reverseCharge ? '<p><strong>Reverse Charge:</strong> VAT to be paid by the recipient.</p>' : ''}
            
            <div class="payment-info">
                <h3>Payment Information</h3>
                <p>${data.companyBankInfo.replace(/\n/g, '<br>')}</p>
                <p>${paymentNote}</p>
            </div>
            
            ${data.notes ? `<div class="notes"><h3>Notes</h3><p>${data.notes.replace(/\n/g, '<br>')}</p></div>` : ''}
            
            <div class="company-footer">
                <p>${data.companyTagline}</p>
                <p>Represented by: ${data.companyRepresentative}</p>
            </div>
        </div>
    `;
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
        return;
    }
    
    try {
        const formData = JSON.parse(savedData);
        
        // Populate form fields with saved data
        for (const key in formData) {
            if (key === 'lineItems') continue; // Handle line items separately
            
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = formData[key];
                } else {
                    element.value = formData[key];
                }
            }
        }
        
        // Handle line items
        const lineItemsContainer = document.getElementById('lineItemsContainer');
        if (lineItemsContainer && Array.isArray(formData.lineItems)) {
            // Clear existing line items
            lineItemsContainer.innerHTML = '';
            
            // Add saved line items
            formData.lineItems.forEach(item => {
                const newItem = document.createElement('div');
                newItem.className = 'line-item';
                newItem.innerHTML = `
                    <input type="text" placeholder="Description" class="item-description" value="${item.description || ''}">
                    <input type="number" placeholder="Quantity" class="item-quantity" min="1" value="${item.quantity || 1}">
                    <input type="number" placeholder="Price" class="item-price" min="0" step="0.01" value="${item.price || ''}">
                    <input type="number" placeholder="VAT %" class="item-vat" min="0" value="${item.vat || 19}">
                    <button type="button" class="remove-item">✕</button>
                `;
                
                // Add event listeners to inputs for auto-save
                const inputs = newItem.querySelectorAll('input');
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
                
                // Add event listener to remove button
                const removeButton = newItem.querySelector('.remove-item');
                if (removeButton) {
                    removeButton.addEventListener('click', function() {
                        newItem.remove();
                        saveFormState();
                        updatePreview();
                    });
                }
                
                lineItemsContainer.appendChild(newItem);
            });
            
            // If no line items were added, add one empty line item
            if (formData.lineItems.length === 0) {
                addLineItem();
            }
        } else {
            // If no line items container or no saved line items, add one empty line item
            addLineItem();
        }
        
        // Update the preview with the loaded data
        updatePreview();
        
        console.log('Form state loaded');
    } catch (error) {
        console.error('Error loading saved form state:', error);
        // Add one empty line item as fallback
        addLineItem();
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
        dueDate: '', // Will be calculated based on payment terms
        
        // Company details
        companyName: document.getElementById('companyName')?.value || '',
        companyAddress: document.getElementById('companyAddress')?.value || '',
        companyEmail: document.getElementById('companyEmail')?.value || '',
        companyPhone: document.getElementById('companyPhone')?.value || '',
        companyTaxId: document.getElementById('companyTaxId')?.value || '',
        companyRegNumber: document.getElementById('companyRegNumber')?.value || '',
        companyBankInfo: document.getElementById('companyBankInfo')?.value || '',
        companyRepresentative: document.getElementById('companyRepresentative')?.value || '',
        companyTagline: document.getElementById('companyTagline')?.value || '',
        paymentTerms: document.getElementById('paymentTerms')?.value || '',
        
        // Client details
        clientName: document.getElementById('clientName')?.value || '',
        clientAddress: document.getElementById('clientAddress')?.value || '',
        
        // Delivery details
        deliveryDateStart: document.getElementById('deliveryDateStart')?.value || '',
        deliveryDateEnd: document.getElementById('deliveryDateEnd')?.value || '',
        
        // Tax settings
        reverseCharge: document.getElementById('reverseCharge')?.checked || false,
        
        // Notes
        notes: document.getElementById('notes')?.value || '',
        
        // Line items
        lineItems: []
    };
    
    // Calculate due date if invoice date and payment terms are set
    if (data.invoiceDate && data.paymentTerms) {
        const dueDate = new Date(data.invoiceDate);
        dueDate.setDate(dueDate.getDate() + parseInt(data.paymentTerms));
        data.dueDate = dueDate.toISOString().split('T')[0];
    }
    
    // Collect line items
    const lineItemsContainer = document.getElementById('lineItemsContainer');
    if (lineItemsContainer) {
        const lineItemRows = lineItemsContainer.querySelectorAll('.line-item');
        
        lineItemRows.forEach(row => {
            const descInput = row.querySelector('.item-description');
            const qtyInput = row.querySelector('.item-quantity');
            const priceInput = row.querySelector('.item-price');
            const vatInput = row.querySelector('.item-vat');
            
            if (descInput && qtyInput && priceInput && vatInput) {
                const description = descInput.value.trim();
                const quantity = parseFloat(qtyInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                const vat = parseFloat(vatInput.value) || 0;
                
                // Only add non-empty line items
                if (description || quantity > 0 || price > 0) {
                    data.lineItems.push({
                        description,
                        quantity,
                        price,
                        vat
                    });
                }
            }
        });
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
            <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
        <!-- Removed BusinessProcessSpecifiedDocumentContextParameter as it's not expected -->
    </rsm:ExchangedDocumentContext>
    
    <rsm:ExchangedDocument>
        <ram:ID>${data.invoiceNumber}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">${formatDate(data.invoiceDate)}</udt:DateTimeString>
        </ram:IssueDateTime>
        ${data.reverseCharge ? '<ram:IncludedNote><ram:Content>Reverse charge: VAT liability transfers to the recipient of this invoice</ram:Content><ram:SubjectCode>AAI</ram:SubjectCode></ram:IncludedNote>' : ''}
        <!-- Removed LanguageID as it's not expected -->
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
                <!-- Removed SpecifiedLegalOrganization as it's not expected -->
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
