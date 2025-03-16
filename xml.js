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

// Function to generate XRechnung 3.0.2 compliant XML
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
    const taxTypeCode = data.reverseCharge ? 'AE' : 'VAT'; // AE = VAT Reverse Charge
    
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
            
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${data.clientName}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
            
            <!-- Add one of the expected elements -->
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
