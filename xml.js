// xml.js

import { generateXRechnung } from './xml-generator.js';

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
                inputs[1
