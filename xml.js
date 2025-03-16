// xml.js

import { generateZugferd } from './xml-generator.js';

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

// Function to validate required fields for ZUGFeRD XML
function validateRequiredFields(data) {
    const errors = [];
    
    // Check invoice number (BR-02)
    if (!data.invoiceNumber.trim()) {
        errors.push("Invoice number is required");
    }
    
    // Check buyer name (BR-07)
    if (!data.clientName.trim()) {
        errors.push("Client name is required");
    }
    
    // Check invoice date
    if (!data.invoiceDate) {
        errors.push("Invoice date is required");
    }
    
    // Check seller name
    if (!data.companyName.trim()) {
        errors.push("Company name is required");
    }
    
    // Check seller address
    if (!data.companyAddress.trim()) {
        errors.push("Company address is required");
    }
    
    // Check client address
    if (!data.clientAddress.trim()) {
        errors.push("Client address is required");
    }
    
    // Check line items
    if (data.lineItems.length === 0) {
        errors.push("At least one line item is required");
    } else {
        // Check each line item
        data.lineItems.forEach((item, index) => {
            if (!item.description.trim()) {
                errors.push(`Line item #${index + 1}: Description is required`);
            }
            if (item.quantity <= 0) {
                errors.push(`Line item #${index + 1}: Quantity must be greater than 0`);
            }
            if (item.price <= 0) {
                errors.push(`Line item #${index + 1}: Price must be greater than 0`);
            }
        });
    }
    
    return errors;
}

// Function to show validation errors
function showValidationErrors(errors) {
    // Create or get error container
    let errorContainer = document.getElementById('validationErrors');
    
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'validationErrors';
        errorContainer.className = 'error-container';
        
        // Insert at the top of the form
        const form = document.querySelector('form');
        if (form) {
            form.insertBefore(errorContainer, form.firstChild);
        } else {
            // If no form, insert before the generate button
            const generateButton = document.getElementById('generateXml');
            if (generateButton) {
                generateButton.parentNode.insertBefore(errorContainer, generateButton);
            }
        }
    }
    
    // Clear previous errors
    errorContainer.innerHTML = '';
    
    // Add error heading
    const heading = document.createElement('h3');
    heading.textContent = 'Please fix the following errors:';
    heading.style.color = 'red';
    errorContainer.appendChild(heading);
    
    // Add error list
    const errorList = document.createElement('ul');
    errorList.style.color = 'red';
    
    errors.forEach(error => {
        const errorItem = document.createElement('li');
        errorItem.textContent = error;
        errorList.appendChild(errorItem);
    });
    
    errorContainer.appendChild(errorList);
    
    // Scroll to errors
    errorContainer.scrollIntoView({ behavior: 'smooth' });
}

// Function to clear validation errors
function clearValidationErrors() {
    const errorContainer = document.getElementById('validationErrors');
    if (errorContainer) {
        errorContainer.innerHTML = '';
    }
}

// Function to generate XML
function generateXml() {
    console.log("Generate XML button clicked");
    try {
        // Clear previous validation errors
        clearValidationErrors();
        
        // Collect form data
        const invoiceData = collectFormData();
        console.log("Form data collected:", invoiceData);
        
        // Validate required fields
        const validationErrors = validateRequiredFields(invoiceData);
        
        if (validationErrors.length > 0) {
            // Show validation errors
            showValidationErrors(validationErrors);
            console.error("Validation errors:", validationErrors);
            return;
        }
        
        // Generate XML
        const xmlContent = generateZugferd(invoiceData);
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
