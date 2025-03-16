// Main invoice functionality for Thingylabs Invoice Generator

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    document.getElementById('deliveryDateStart').value = today;
    document.getElementById('deliveryDateEnd').value = today;
    
    // Invoice number generation
    const generateInvoiceNumber = document.getElementById('generateInvoiceNumber');
    generateInvoiceNumber.addEventListener('click', function() {
        const invoiceNumber = generateNewInvoiceNumber();
        document.getElementById('invoiceNumber').value = invoiceNumber;
        updatePreview();
    });
    
    // Generate initial invoice number
    if (!document.getElementById('invoiceNumber').value) {
        document.getElementById('invoiceNumber').value = generateNewInvoiceNumber();
    }
    
    // Load saved clients
    loadClients();
    
    // Client selection change
    document.getElementById('clientSelect').addEventListener('change', function() {
        const selectedValue = this.value;
        
        if (selectedValue === 'new') {
            // Clear client fields for new client
            document.getElementById('clientName').value = '';
            document.getElementById('clientAddress').value = '';
            document.getElementById('reverseCharge').checked = false;
            
            // Reset the dropdown to the first option
            this.selectedIndex = 0;
        } else if (selectedValue) {
            // Load client data
            const clients = JSON.parse(localStorage.getItem('savedClients') || '[]');
            const selectedClient = clients.find(client => client.id === selectedValue);
            
            if (selectedClient) {
                document.getElementById('clientName').value = selectedClient.name;
                document.getElementById('clientAddress').value = selectedClient.address;
                document.getElementById('reverseCharge').checked = selectedClient.reverseCharge;
                
                // Update VAT fields based on reverse charge
                const vatInputs = document.querySelectorAll('.item-vat');
                if (selectedClient.reverseCharge) {
                    vatInputs.forEach(input => {
                        input.value = '0';
                        input.disabled = true;
                    });
                } else {
                    vatInputs.forEach(input => {
                        input.value = '19';
                        input.disabled = false;
                    });
                }
                
                updatePreview();
            }
        }
    });
    
    // Save client
    document.getElementById('saveClient').addEventListener('click', function() {
        const clientName = document.getElementById('clientName').value.trim();
        const clientAddress = document.getElementById('clientAddress').value.trim();
        const reverseCharge = document.getElementById('reverseCharge').checked;
        
        if (!clientName) {
            alert('Please enter a client name');
            return;
        }
        
        // Get existing clients
        const clients = JSON.parse(localStorage.getItem('savedClients') || '[]');
        
        // Check if client already exists
        const existingClientIndex = clients.findIndex(client => client.name === clientName);
        
        if (existingClientIndex >= 0) {
            // Update existing client
            clients[existingClientIndex] = {
                id: clients[existingClientIndex].id,
                name: clientName,
                address: clientAddress,
                reverseCharge: reverseCharge
            };
            
            alert(`Client "${clientName}" updated`);
        } else {
            // Add new client
            const newClient = {
                id: Date.now().toString(), // Use timestamp as ID
                name: clientName,
                address: clientAddress,
                reverseCharge: reverseCharge
            };
            
            clients.push(newClient);
            alert(`Client "${clientName}" saved`);
        }
        
        // Save to localStorage
        localStorage.setItem('savedClients', JSON.stringify(clients));
        
        // Reload client dropdown
        loadClients();
    });
    
    // Delete client
    document.getElementById('deleteClient').addEventListener('click', function() {
        const clientName = document.getElementById('clientName').value.trim();
        
        if (!clientName) {
            alert('Please select a client to delete');
            return;
        }
        
        // Get existing clients
        const clients = JSON.parse(localStorage.getItem('savedClients') || '[]');
        
        // Find client index
        const clientIndex = clients.findIndex(client => client.name === clientName);
        
        if (clientIndex >= 0) {
            if (confirm(`Are you sure you want to delete client "${clientName}"?`)) {
                // Remove client
                clients.splice(clientIndex, 1);
                
                // Save to localStorage
                localStorage.setItem('savedClients', JSON.stringify(clients));
                
                // Clear client fields
                document.getElementById('clientName').value = '';
                document.getElementById('clientAddress').value = '';
                document.getElementById('reverseCharge').checked = false;
                
                // Reload client dropdown
                loadClients();
                
                alert(`Client "${clientName}" deleted`);
                updatePreview();
            }
        } else {
            alert(`Client "${clientName}" not found`);
        }
    });
    
    // Add line item
    document.getElementById('addLineItem').addEventListener('click', addLineItem);
    
    // Remove line item (for initial item)
    document.querySelector('.remove-item').addEventListener('click', function() {
        if (document.querySelectorAll('.line-item').length > 1) {
            this.closest('.line-item').remove();
            updatePreview();
        }
    });
    
    // Add event listeners for all form inputs
    const allInputs = document.querySelectorAll('input, textarea, select');
    allInputs.forEach(input => {
        input.addEventListener('input', updatePreview);
    });
    
    // Reverse charge checkbox
    document.getElementById('reverseCharge').addEventListener('change', function() {
        const vatInputs = document.querySelectorAll('.item-vat');
        if (this.checked) {
            vatInputs.forEach(input => {
                input.value = '0';
                input.disabled = true;
            });
        } else {
            vatInputs.forEach(input => {
                input.value = '19';
                input.disabled = false;
            });
        }
        updatePreview();
    });
    
    // Print invoice - Fixed to avoid empty space at the beginning
    document.getElementById('printInvoice').addEventListener('click', function() {
        const invoicePreview = document.getElementById('invoicePreview');
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                    }
                    @media print {
                        body { 
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                ${invoicePreview.innerHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Print after a short delay to ensure content is loaded
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    });
    
    // Load last used form data
    loadLastFormData();
    
    // Initial preview update
    updatePreview();
}

// Function to load clients into dropdown
function loadClients() {
    const clientSelect = document.getElementById('clientSelect');
    const clients = JSON.parse(localStorage.getItem('savedClients') || '[]');
    
    // Clear existing options except the first two
    while (clientSelect.options.length > 2) {
        clientSelect.remove(2);
    }
    
    // Sort clients alphabetically
    clients.sort((a, b) => a.name.localeCompare(b.name));
    
    // Add client options
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        clientSelect.appendChild(option);
    });
}

// Function to save the current form data
function saveFormData() {
    const data = collectFormData();
    localStorage.setItem('lastFormData', JSON.stringify(data));
}

// Function to load the last used form data
function loadLastFormData() {
    const lastFormData = JSON.parse(localStorage.getItem('lastFormData') || '{}');
    
    if (Object.keys(lastFormData).length === 0) {
        return; // No saved data
    }
    
    // Restore client information
    if (lastFormData.clientName) {
        document.getElementById('clientName').value = lastFormData.clientName;
    }
    
    if (lastFormData.clientAddress) {
        document.getElementById('clientAddress').value = lastFormData.clientAddress;
    }
    
    if (lastFormData.reverseCharge) {
        document.getElementById('reverseCharge').checked = lastFormData.reverseCharge;
        
        // Update VAT fields
        const vatInputs = document.querySelectorAll('.item-vat');
        if (lastFormData.reverseCharge) {
            vatInputs.forEach(input => {
                input.value = '0';
                input.disabled = true;
            });
        }
    }
    
    // Restore notes
    if (lastFormData.notes) {
        document.getElementById('notes').value = lastFormData.notes;
    }
    
    // Restore line items (if any)
    if (lastFormData.lineItems && lastFormData.lineItems.length > 0) {
        // Clear existing line items
        const lineItemsContainer = document.getElementById('lineItemsContainer');
        lineItemsContainer.innerHTML = '';
        
        // Add saved line items
        lastFormData.lineItems.forEach(item => {
            const lineItem = document.createElement('div');
            lineItem.className = 'line-item';
            
            const vatDisabled = lastFormData.reverseCharge ? 'disabled' : '';
            
            lineItem.innerHTML = `
                <input type="text" placeholder="Description" class="item-description" value="${item.description || ''}">
                <input type="number" placeholder="Quantity" class="item-quantity" min="1" value="${item.quantity || 1}">
                <input type="number" placeholder="Price" class="item-price" min="0" step="0.01" value="${item.price || ''}">
                <input type="number" placeholder="VAT %" class="item-vat" min="0" value="${item.vat || 0}" ${vatDisabled}>
                <button type="button" class="remove-item">✕</button>
            `;
            
            lineItemsContainer.appendChild(lineItem);
            
            // Add event listener to the new remove button
            lineItem.querySelector('.remove-item').addEventListener('click', function() {
                if (document.querySelectorAll('.line-item').length > 1) {
                    lineItem.remove();
                    updatePreview();
                }
            });
            
            // Add event listeners for real-time preview updates
            const inputs = lineItem.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('input', updatePreview);
            });
        });
    }
}

// Function to add a new line item
function addLineItem() {
    const lineItem = document.createElement('div');
    lineItem.className = 'line-item';
    
    // Check if reverse charge is enabled
    const reverseCharge = document.getElementById('reverseCharge').checked;
    const vatValue = reverseCharge ? '0' : '19';
    const vatDisabled = reverseCharge ? 'disabled' : '';
    
    lineItem.innerHTML = `
        <input type="text" placeholder="Description" class="item-description">
        <input type="number" placeholder="Quantity" class="item-quantity" min="1" value="1">
        <input type="number" placeholder="Price" class="item-price" min="0" step="0.01">
        <input type="number" placeholder="VAT %" class="item-vat" min="0" value="${vatValue}" ${vatDisabled}>
        <button type="button" class="remove-item">✕</button>
    `;
    document.getElementById('lineItemsContainer').appendChild(lineItem);
    
    // Add event listener to the new remove button
    lineItem.querySelector('.remove-item').addEventListener('click', function() {
        lineItem.remove();
        updatePreview();
    });
    
    // Add event listeners for real-time preview updates
    const inputs = lineItem.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', updatePreview);
    });
    
    updatePreview();
}

// Function to generate a new invoice number
function generateNewInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    
    // Get the last invoice number from localStorage
    const lastInvoiceData = JSON.parse(localStorage.getItem('lastInvoiceData') || '{}');
    let counter = 1;
    
    // If we have a previous invoice number from today, increment the counter
    if (lastInvoiceData.date === datePrefix) {
        counter = lastInvoiceData.counter + 1;
    }
    
    // Save the new counter value
    localStorage.setItem('lastInvoiceData', JSON.stringify({
        date: datePrefix,
        counter: counter
    }));
    
    // Format the invoice number
    return `${datePrefix}-${counter.toString().padStart(3, '0')}`;
}

// Function to update the preview
function updatePreview() {
    const data = collectFormData();
    const preview = document.getElementById('invoicePreview');
    
    // Save form data for next time
    saveFormData();
    
    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;
    
    const lineItemsHtml = data.lineItems.map(item => {
        const itemTotal = item.quantity * item.price;
        const itemVat = itemTotal * (item.vat / 100);
        
        subtotal += itemTotal;
        totalVat += itemVat;
        
        return `
            <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>€${item.price.toFixed(2)}</td>
                <td>${item.vat}%</td>
                <td>€${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    const total = subtotal + totalVat;
    
    // Format service period
    const deliveryDateStart = formatDate(data.deliveryDateStart);
    const deliveryDateEnd = formatDate(data.deliveryDateEnd);
    const servicePeriod = deliveryDateStart === deliveryDateEnd 
        ? deliveryDateStart 
        : `${deliveryDateStart} - ${deliveryDateEnd}`;
    
    // Reverse charge note
    const reverseChargeNote = data.reverseCharge 
        ? '<p><strong>Note:</strong> VAT 0% - Reverse Charge. VAT liability transfers to the recipient of this invoice.</p>'
        : '';
    
    preview.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2rem;">
            <div>
                <h2 style="margin-bottom: 0.5rem;">INVOICE</h2>
                <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                <p><strong>Date:</strong> ${formatDate(data.invoiceDate)}</p>
                <p><strong>Service Period:</strong> ${servicePeriod}</p>
            </div>
            <div style="text-align: right;">
                <h3>${data.companyName}</h3>
                <p style="white-space: pre-line;">${data.companyAddress}</p>
                <p><strong>Email:</strong> ${data.companyEmail}</p>
                <p><strong>Phone:</strong> ${data.companyPhone}</p>
                <p><strong>VAT ID:</strong> ${data.companyTaxId}</p>
                <p><strong>Reg. No.:</strong> ${data.companyRegNumber}</p>
            </div>
        </div>
        
        <div style="margin-bottom: 2rem;">
            <h3>Bill To:</h3>
            <p>${data.clientName}</p>
            <p style="white-space: pre-line;">${data.clientAddress}</p>
        </div>
        
        ${reverseChargeNote ? `<div style="margin-bottom: 2rem;">${reverseChargeNote}</div>` : ''}
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
            <thead>
                <tr style="background-color: #f3f4f6;">
                    <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">Description</th>
                    <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">Qty</th>
                    <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">Price</th>
                    <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">VAT</th>
                    <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${lineItemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" style="text-align: right; padding: 0.5rem;"><strong>Subtotal:</strong></td>
                    <td style="padding: 0.5rem;">€${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="4" style="text-align: right; padding: 0.5rem;"><strong>VAT:</strong></td>
                    <td style="padding: 0.5rem;">€${totalVat.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="4" style="text-align: right; padding: 0.5rem;"><strong>Total:</strong></td>
                    <td style="padding: 0.5rem;"><strong>€${total.toFixed(2)}</strong></td>
                </tr>
            </tfoot>
        </table>
        
        ${data.companyBankInfo ? `
        <div style="margin-bottom: 2rem;">
            <h3>Payment Information:</h3>
            <p style="white-space: pre-line;">${data.companyBankInfo}</p>
        </div>
        ` : ''}
        
        ${data.notes ? `
        <div style="margin-bottom: 2rem;">
            <h3>Notes:</h3>
            <p style="white-space: pre-line;">${data.notes}</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 3rem; text-align: center; color: #666;">
            <p>${data.companyName} | ${data.companyTagline}</p>
            <p>Represented by: ${data.companyRepresentative}</p>
        </div>
    `;
}

// Helper function to collect form data
function collectFormData() {
    const lineItems = [];
    document.querySelectorAll('.line-item').forEach(item => {
        const description = item.querySelector('.item-description').value;
        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        const vat = parseFloat(item.querySelector('.item-vat').value) || 0;
        
        lineItems.push({
            description,
            quantity,
            price,
            vat
        });
    });
    
    return {
        // Company info
        companyName: document.getElementById('companyName').value,
        companyEmail: document.getElementById('companyEmail').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyTaxId: document.getElementById('companyTaxId').value,
        companyRegNumber: document.getElementById('companyRegNumber').value,
        companyRepresentative: document.getElementById('companyRepresentative').value,
        companyTagline: document.getElementById('companyTagline').value,
        companyBankInfo: document.getElementById('companyBankInfo').value,
        
        // Invoice details
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        deliveryDateStart: document.getElementById('deliveryDateStart').value,
        deliveryDateEnd: document.getElementById('deliveryDateEnd').value,
        
        // Client info
        clientName: document.getElementById('clientName').value,
        clientAddress: document.getElementById('clientAddress').value,
        
        // Reverse charge
        reverseCharge: document.getElementById('reverseCharge').checked,
        
        // Other
        notes: document.getElementById('notes').value,
        lineItems
    };
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
