/**
 * Generates ZUGFeRD 2.3.2 Extended compliant XML from invoice data
 * @param {Object} data - The invoice data
 * @returns {string} - The generated XML content
 * @throws {Error} - If a required field is missing or invalid
 */
function generateZugferd(data) {
    // Validate required fields
    const requiredFields = [
        "invoiceNumber",
        "invoiceDate",
        "companyName",
        "companyAddress",
        "companyTaxId",
        "clientName",
        "clientAddress",
        "lineItems",
    ];

    const missingFields = requiredFields.filter((field) => !data[field]);
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    if (!Array.isArray(data.lineItems) || data.lineItems.length === 0) {
        throw new Error("lineItems must be a non-empty array");
    }

    // Helper function to format dates to YYYYMMDD
    const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        if (isNaN(d)) throw new Error(`Invalid date: ${date}`);
        return d.toISOString().split("T")[0].replace(/-/g, "");
    };

    // Helper function to extract address parts
    const extractAddressParts = (address) => {
        const lines = address.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.length < 2) {
            throw new Error("Address must include at least street and city");
        }

        const street = lines[0];
        const match = lines[1].match(/(\d{5})\s+(.+)/);
        if (!match) {
            throw new Error("Address must include a valid postal code and city");
        }

        const postalCode = match[1];
        const city = match[2];
        const country = lines.length >= 3 ? lines[2] : "DE";

        return { street, postalCode, city, country };
    };

    // Escape XML special characters
    const escapeXml = (str) => {
        if (!str) return "";
        return str
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    };

    // Extract address parts
    const companyAddress = extractAddressParts(data.companyAddress);
    const clientAddress = extractAddressParts(data.clientAddress);

    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;

    data.lineItems.forEach((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const vat = parseFloat(item.vat) || 0;

        const lineTotal = quantity * price;
        const lineVat = data.reverseCharge ? 0 : lineTotal * (vat / 100);

        subtotal += lineTotal;
        totalVat += lineVat;
    });

    const total = subtotal + totalVat;

    // Build XML string
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rsm:CrossIndustryInvoice\n';
    xml += '  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"\n';
    xml += '  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"\n';
    xml += '  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"\n';
    xml += '  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">\n';

    // Document Context
    xml += '  <rsm:ExchangedDocumentContext>\n';
    xml += '    <ram:GuidelineSpecifiedDocumentContextParameter>\n';
    xml += '      <ram:ID>urn:factur-x.eu:1p0:extended</ram:ID>\n';
    xml += '    </ram:GuidelineSpecifiedDocumentContextParameter>\n';
    xml += '  </rsm:ExchangedDocumentContext>\n';

    // Document Header
    xml += '  <rsm:ExchangedDocument>\n';
    xml += `    <ram:ID>${escapeXml(data.invoiceNumber)}</ram:ID>\n`;
    xml += '    <ram:TypeCode>380</ram:TypeCode>\n';
    xml += '    <ram:IssueDateTime>\n';
    xml += '      <udt:DateTimeString format="102">';
    xml += `${escapeXml(formatDate(data.invoiceDate))}</udt:DateTimeString>\n`;
    xml += '    </ram:IssueDateTime>\n';
    
    if (data.notes) {
        xml += '    <ram:IncludedNote>\n';
        xml += `      <ram:Content>${escapeXml(data.notes)}</ram:Content>\n`;
        xml += '    </ram:IncludedNote>\n';
    }
    
    if (data.reverseCharge) {
        xml += '    <ram:IncludedNote>\n';
        xml += '      <ram:Content>Reverse charge: VAT liability transfers to the recipient of this invoice</ram:Content>\n';
        xml += '    </ram:IncludedNote>\n';
    }
    xml += '  </rsm:ExchangedDocument>\n';

    // Trade Transaction
    xml += '  <rsm:SupplyChainTradeTransaction>\n';
    
    // Trade Agreement
    xml += '    <ram:ApplicableHeaderTradeAgreement>\n';
    xml += '      <ram:SellerTradeParty>\n';
    xml += `        <ram:Name>${escapeXml(data.companyName)}</ram:Name>\n`;
    xml += '        <ram:PostalTradeAddress>\n';
    xml += `          <ram:PostcodeCode>${escapeXml(companyAddress.postalCode)}</ram:PostcodeCode>\n`;
    xml += `          <ram:LineOne>${escapeXml(companyAddress.street)}</ram:LineOne>\n`;
    xml += `          <ram:CityName>${escapeXml(companyAddress.city)}</ram:CityName>\n`;
    xml += `          <ram:CountryID>${escapeXml(companyAddress.country)}</ram:CountryID>\n`;
    xml += '        </ram:PostalTradeAddress>\n';
    xml += '        <ram:SpecifiedTaxRegistration>\n';
    xml += `          <ram:ID schemeID="VA">${escapeXml(data.companyTaxId)}</ram:ID>\n`;
    xml += '        </ram:SpecifiedTaxRegistration>\n';
    xml += '      </ram:SellerTradeParty>\n';
    xml += '      <ram:BuyerTradeParty>\n';
    xml += `        <ram:Name>${escapeXml(data.clientName)}</ram:Name>\n`;
    xml += '        <ram:PostalTradeAddress>\n';
    xml += `          <ram:PostcodeCode>${escapeXml(clientAddress.postalCode)}</ram:PostcodeCode>\n`;
    xml += `          <ram:LineOne>${escapeXml(clientAddress.street)}</ram:LineOne>\n`;
    xml += `          <ram:CityName>${escapeXml(clientAddress.city)}</ram:CityName>\n`;
    xml += `          <ram:CountryID>${escapeXml(clientAddress.country)}</ram:CountryID>\n`;
    xml += '        </ram:PostalTradeAddress>\n';
    xml += '      </ram:BuyerTradeParty>\n';
    xml += '    </ram:ApplicableHeaderTradeAgreement>\n';

    // Delivery
    if (data.deliveryDateStart && data.deliveryDateEnd) {
        xml += '    <ram:ApplicableHeaderTradeDelivery>\n';
        xml += '      <ram:ActualDeliverySupplyChainEvent>\n';
        xml += '        <ram:OccurrenceDateTime>\n';
        xml += '          <udt:DateTimeString format="102">';
        xml += `${escapeXml(formatDate(data.deliveryDateStart))}</udt:DateTimeString>\n`;
        xml += '        </ram:OccurrenceDateTime>\n';
        xml += '      </ram:ActualDeliverySupplyChainEvent>\n';
        xml += '    </ram:ApplicableHeaderTradeDelivery>\n';
    }

    // Settlement
    xml += '    <ram:ApplicableHeaderTradeSettlement>\n';
    xml += `      <ram:PaymentReference>${escapeXml(data.invoiceNumber)}</ram:PaymentReference>\n`;
    xml += '      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>\n';
    
    if (data.companyBankInfo) {
        const [iban, bic] = data.companyBankInfo.split("\n");
        xml += '      <ram:SpecifiedTradeSettlementPaymentMeans>\n';
        xml += '        <ram:TypeCode>58</ram:TypeCode>\n';
        xml += '        <ram:PayeePartyCreditorFinancialAccount>\n';
        xml += `          <ram:IBANID>${escapeXml(iban)}</ram:IBANID>\n`;
        xml += '        </ram:PayeePartyCreditorFinancialAccount>\n';
        if (bic) {
            xml += '        <ram:PayeeSpecifiedCreditorFinancialInstitution>\n';
            xml += `          <ram:BICID>${escapeXml(bic)}</ram:BICID>\n`;
            xml += '        </ram:PayeeSpecifiedCreditorFinancialInstitution>\n';
        }
        xml += '      </ram:SpecifiedTradeSettlementPaymentMeans>\n';
    }
    
    xml += '      <ram:ReceivableSpecifiedTradeAccountingAccount>\n';
    xml += `        <ram:ID>${escapeXml(data.invoiceNumber)}</ram:ID>\n`;
    xml += '      </ram:ReceivableSpecifiedTradeAccountingAccount>\n';
    xml += '      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n';
    xml += `        <ram:LineTotalAmount>${subtotal.toFixed(2)}</ram:LineTotalAmount>\n`;
    xml += `        <ram:TaxBasisTotalAmount>${subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>\n`;
    xml += `        <ram:TaxTotalAmount currencyID="EUR">${totalVat.toFixed(2)}</ram:TaxTotalAmount>\n`;
    xml += `        <ram:GrandTotalAmount>${total.toFixed(2)}</ram:GrandTotalAmount>\n`;
    xml += `        <ram:DuePayableAmount>${total.toFixed(2)}</ram:DuePayableAmount>\n`;
    xml += '      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n';
    xml += '    </ram:ApplicableHeaderTradeSettlement>\n';

    // Line Items
    data.lineItems.forEach((item, index) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const vat = parseFloat(item.vat) || 0;
        const lineTotal = quantity * price;

        xml += '    <ram:IncludedSupplyChainTradeLineItem>\n';
        xml += '      <ram:AssociatedDocumentLineDocument>\n';
        xml += `        <ram:LineID>${index + 1}</ram:LineID>\n`;
        xml += '      </ram:AssociatedDocumentLineDocument>\n';
        xml += '      <ram:SpecifiedTradeProduct>\n';
        xml += `        <ram:Name>${escapeXml(item.description || "Item")}</ram:Name>\n`;
        xml += '      </ram:SpecifiedTradeProduct>\n';
        xml += '      <ram:SpecifiedLineTradeAgreement>\n';
        xml += '        <ram:NetPriceProductTradePrice>\n';
        xml += `          <ram:ChargeAmount>${price.toFixed(2)}</ram:ChargeAmount>\n`;
        xml += '        </ram:NetPriceProductTradePrice>\n';
        xml += '      </ram:SpecifiedLineTradeAgreement>\n';
        xml += '      <ram:SpecifiedLineTradeDelivery>\n';
        xml += '        <ram:BilledQuantity unitCode="C62">';
        xml += `${quantity.toFixed(2)}</ram:BilledQuantity>\n`;
        xml += '      </ram:SpecifiedLineTradeDelivery>\n';
        xml += '      <ram:SpecifiedLineTradeSettlement>\n';
        xml += '        <ram:ApplicableTradeTax>\n';
        xml += '          <ram:TypeCode>VAT</ram:TypeCode>\n';
        xml += `          <ram:CategoryCode>${data.reverseCharge ? "AE" : "S"}</ram:CategoryCode>\n`;
        xml += '          <ram:RateApplicablePercent>';
        xml += `${data.reverseCharge ? "0" : vat.toFixed(2)}</ram:RateApplicablePercent>\n`;
        xml += '        </ram:ApplicableTradeTax>\n';
        xml += '        <ram:SpecifiedTradeSettlementLineMonetarySummation>\n';
        xml += `          <ram:LineTotalAmount>${lineTotal.toFixed(2)}</ram:LineTotalAmount>\n`;
        xml += '        </ram:SpecifiedTradeSettlementLineMonetarySummation>\n';
        xml += '      </ram:SpecifiedLineTradeSettlement>\n';
        xml += '    </ram:IncludedSupplyChainTradeLineItem>\n';
    });

    xml += '  </rsm:SupplyChainTradeTransaction>\n';
    xml += '</rsm:CrossIndustryInvoice>';

    return xml;
}

// Export the function
export { generateZugferd };
