// invoice.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the invoice generator
    initInvoiceGenerator();
    
    // Load saved company configuration if available
    loadCompanyConfig();
    
    // Set today's date as default for invoice date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Event listeners
    document.getElementById('invoiceDate').addEventListener('change', updateDueDate);
    document.getElementById('paymentTerms').addEventListener('change', updateDueDate);
    document.getElementById('saveCompanyConfig').addEventListener('click', saveCompanyConfig);
    document.getElementById('generateInvoiceNumber').addEventListener('click', generateInvoiceNumber);
    document.getElementById('addLineItem').addEventListener('click', addLineItem);
    document.getElementById('saveClient').addEventListener('click', saveClient);
    document.getElementById('deleteClient').addEventListener('click', deleteClient);
    document.getElementById('clientSelect').addEventListener('change', loadClient);
    document.getElementById('printInvoice').addEventListener('click', printInvoice);
    
    // Add event listeners for line item calculations
    document.getElementById('lineItemsContainer').addEventListener('input', function(e) {
        if (e.target.classList.contains('item-quantity') || 
            e.target.classList.contains('item-price') || 
            e.target.classList.contains('item-vat')) {
            updateInvoicePreview();
        }
    });
    
    // Add event listener for removing line items
    document.getElementById('lineItemsContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-item')) {
            e.target.closest('.line-item').remove();
            updateInvoicePreview();
        }
    });
    
    // Add event listeners for form fields to update preview
    const formFields = document.querySelectorAll('input, textarea, select');
    formFields.forEach(field => {
        field.addEventListener('input', updateInvoicePreview);
    });
    
    // Initialize with one line item
    addLineItem();
    
    // Generate initial preview
    updateInvoicePreview();
});

// Function to initialize the invoice generator
function initInvoiceGenerator() {
    // Load clients from localStorage
    loadClients();
}

// Function to load saved company configuration
function loadCompanyConfig() {
    const savedConfig = localStorage.getItem('companyConfig');
    
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        
        // Set form values from saved config
        document.getElementById('companyName').value = config.companyName || '';
        document.getElementById('companyEmail').value = config.companyEmail || '';
        document.getElementById('companyPhone').value = config.companyPhone || '';
        document.getElementById('companyAddress').value = config.companyAddress || '';
        document.getElementById('companyTaxId').value = config.companyTaxId || '';
        document.getElementById('companyRegNumber').value = config.companyRegNumber || '';
        document.getElementById('companyRepresentative').value = config.companyRepresentative || '';
        document.getElementById('companyTagline').value = config.companyTagline || '';
        document.getElementById('companyBankInfo').value = config.companyBankInfo || '';
        document.getElementById('paymentTerms').value = config.paymentTerms || '7';
    } else {
        // Set default values if no saved config
        document.getElementById('companyBankInfo').value = 'BE50967609727818\nTRWIBEB1XXX';
        document.getElementById('paymentTerms').value = '7';
    }
}

// Function to save company configuration
function saveCompanyConfig() {
    const config = {
        companyName: document.getElementById('companyName').value,
        companyEmail: document.getElementById('companyEmail').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyTaxId: document.getElementById('companyTaxId').value,
        companyRegNumber: document.getElementById('companyRegNumber').value,
        companyRepresentative: document.getElementById('companyRepresentative').value,
        companyTagline: document.getElementById('companyTagline').value,
        companyBankInfo: document.getElementById('companyBankInfo').value,
        paymentTerms: document.getElementById('paymentTerms').value
    };
    
    localStorage.setItem('companyConfig', JSON.stringify(config));
    
    // Show success message
    const saveBtn = document.getElementById('saveCompanyConfig');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    saveBtn.classList.add('success');
    
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.classList.remove('success');
    }, 2000);
    
    // Update the preview
    updateInvoicePreview();
}

// Function to update due date based on invoice date and payment terms
function updateDueDate() {
    const invoiceDate = document.getElementById('invoiceDate').value;
    const paymentTerms = parseInt(document.getElementById('paymentTerms').value) || 0;
    
    if (invoiceDate) {
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + paymentTerms);
        
        // Update the preview with the new due date
        updateInvoicePreview();
    }
}

// Function to generate invoice number
function generateInvoiceNumber() {
    const today = new Date();
    const year = today.getFullYear().toString().substr(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    // Get the last invoice number from localStorage
    const lastInvoice = localStorage.getItem('lastInvoiceNumber');
    let counter = 1;
    
    if (lastInvoice) {
        const lastDate = lastInvoice.substr(0, 6);
        const lastCounter = parseInt(lastInvoice.substr(7));
        
        // If the date is the same, increment the counter
        if (lastDate === `${year}${month}${day}`) {
            counter = lastCounter + 1;
        }
    }
    
    const invoiceNumber = `${year}${month}${day}-${counter.toString().padStart(3, '0')}`;
    document.getElementById('invoiceNumber').value = invoiceNumber;
    
    // Save the new invoice number
    localStorage.setItem('lastInvoiceNumber', invoiceNumber);
    
    // Update the preview
    updateInvoicePreview();
}

// Function to add a new line item
function addLineItem() {
    const container = document.getElementById('lineItemsContainer');
    const newItem = document.createElement('div');
    newItem.className = 'line-item';
    newItem.innerHTML = `
        <input type="text" placeholder="Description" class="item-description">
        <input type="number" placeholder="Quantity" class="item-quantity" min="1" value="1">
        <input type="number" placeholder="Price" class="item-price" min="0" step="0.01">
        <input type="number" placeholder="VAT %" class="item-vat" min="0" value="19">
        <button type="button" class="remove-item">✕</button>
    `;
    container.appendChild(newItem);
}

// Function to collect form data
function collectFormData() {
    // Get all line items
    const lineItemElements = document.querySelectorAll('.line-item');
    const lineItems = [];
    
    lineItemElements.forEach(item => {
        const description = item.querySelector('.item-description').value;
        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        const vat = parseFloat(item.querySelector('.item-vat').value) || 0;
        
        if (description && quantity > 0 && price > 0) {
            lineItems.push({
                description,
                quantity,
                price,
                vat
            });
        }
    });
    
    // Calculate due date
    const invoiceDate = document.getElementById('invoiceDate').value;
    const paymentTerms = parseInt(document.getElementById('paymentTerms').value) || 0;
    let dueDate = '';
    
    if (invoiceDate) {
        const dueDateObj = new Date(invoiceDate);
        dueDateObj.setDate(dueDateObj.getDate() + paymentTerms);
        dueDate = dueDateObj.toISOString().split('T')[0];
    }
    
    // Return the collected data
    return {
        companyName: document.getElementById('companyName').value,
        companyEmail: document.getElementById('companyEmail').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyTaxId: document.getElementById('companyTaxId').value,
        companyRegNumber: document.getElementById('companyRegNumber').value,
        companyRepresentative: document.getElementById('companyRepresentative').value,
        companyTagline: document.getElementById('companyTagline').value,
        companyBankInfo: document.getElementById('companyBankInfo').value,
        paymentTerms: document.getElementById('paymentTerms').value,
        
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        deliveryDateStart: document.getElementById('deliveryDateStart').value,
        deliveryDateEnd: document.getElementById('deliveryDateEnd').value,
        
        clientName: document.getElementById('clientName').value,
        clientAddress: document.getElementById('clientAddress').value,
        
        reverseCharge: document.getElementById('reverseCharge').checked,
        notes: document.getElementById('notes').value,
        
        lineItems: lineItems
    };
}

// Function to update the invoice preview
function updateInvoicePreview() {
    const data = collectFormData();
    const preview = document.getElementById('invoicePreview');
    
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

// Functions for client management
function loadClients() {
    const clientSelect = document.getElementById('clientSelect');
    const savedClients = localStorage.getItem('clients');
    
    // Clear existing options except the first two
    while (clientSelect.options.length > 2) {
        clientSelect.remove(2);
    }
    
    if (savedClients) {
        const clients = JSON.parse(savedClients);
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });
    }
}

function saveClient() {
    const clientName = document.getElementById('clientName').value;
    const clientAddress = document.getElementById('clientAddress').value;
    
    if (!clientName) {
        alert('Please enter a client name');
        return;
    }
    
    const clientId = document.getElementById('clientSelect').value;
    const savedClientsStr = localStorage.getItem('clients');
    const savedClients = savedClientsStr ? JSON.parse(savedClientsStr) : [];
    
    if (clientId && clientId !== 'new') {
        // Update existing client
        const clientIndex = savedClients.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            savedClients[clientIndex] = {
                id: clientId,
                name: clientName,
                address: clientAddress
            };
        }
    } else {
        // Add new client
        const newId = Date.now().toString();
        savedClients.push({
            id: newId,
            name: clientName,
            address: clientAddress
        });
        
        // Select the new client
        const clientSelect = document.getElementById('clientSelect');
        const option = document.createElement('option');
        option.value = newId;
        option.textContent = clientName;
        clientSelect.appendChild(option);
        clientSelect.value = newId;
    }
    
    localStorage.setItem('clients', JSON.stringify(savedClients));
    
    // Show success message
    const saveBtn = document.getElementById('saveClient');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    saveBtn.classList.add('success');
    
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.classList.remove('success');
    }, 2000);
    
    // Reload clients
    loadClients();
}

function loadClient() {
    const clientId = document.getElementById('clientSelect').value;
    
    if (clientId === 'new') {
        // Clear client fields for new client
        document.getElementById('clientName').value = '';
        document.getElementById('clientAddress').value = '';
        return;
    }
    
    if (!clientId) {
        return;
    }
    
    const savedClientsStr = localStorage.getItem('clients');
    if (savedClientsStr) {
        const savedClients = JSON.parse(savedClientsStr);
        const client = savedClients.find(c => c.id === clientId);
        
        if (client) {
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientAddress').value = client.address;
            
            // Update the preview
            updateInvoicePreview();
        }
    }
}

function deleteClient() {
    const clientId = document.getElementById('clientSelect').value;
    
    if (!clientId || clientId === 'new') {
        alert('Please select a client to delete');
        return;
    }
    
    if (confirm('Are you sure you want to delete this client?')) {
        const savedClientsStr = localStorage.getItem('clients');
        if (savedClientsStr) {
            const savedClients = JSON.parse(savedClientsStr);
            const updatedClients = savedClients.filter(c => c.id !== clientId);
            
            localStorage.setItem('clients', JSON.stringify(updatedClients));
            
            // Clear client fields
            document.getElementById('clientName').value = '';
            document.getElementById('clientAddress').value = '';
            document.getElementById('clientSelect').value = '';
            
            // Reload clients
            loadClients();
            
            // Update the preview
            updateInvoicePreview();
        }
    }
}

// Function to print the invoice
function printInvoice() {
    // Create a temporary print-specific style
    const style = document.createElement('style');
    style.innerHTML = `
        @media print {
            body * {
                visibility: hidden;
            }
            .invoice-preview, .invoice-preview * {
                visibility: visible;
            }
            .invoice-preview {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                box-shadow: none;
                padding: 20px;
            }
            .container, .preview-section {
                padding: 0;
                margin: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Print the document
    window.print();
    
    // Remove the temporary style
    document.head.removeChild(style);
}

