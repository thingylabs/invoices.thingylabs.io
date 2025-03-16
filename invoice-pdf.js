// Function to generate PDF
function generatePdf() {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        alert('PDF library is still loading. Please try again in a moment.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    
    html2canvas(document.getElementById('invoicePreview')).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`Invoice-${document.getElementById('invoiceNumber').value || 'new'}.pdf`);
    });
}

// Make the function available globally
window.generatePdf = generatePdf;
