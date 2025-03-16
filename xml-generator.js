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

    // Build the XML string
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                         xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                         xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
                         xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:factur-x.eu:1p0:extended</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    <rsm:ExchangedDocument>
        <ram:ID>${data.invoiceNumber}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">${formatDate(data.invoiceDate)}</udt:DateTimeString>
        </ram:IssueDateTime>
        ${data.notes ? `<ram:IncludedNote><ram:Content>${data.notes}</ram:Content></ram:IncludedNote>` : ""}
        ${data.reverseCharge ? `<ram:IncludedNote><ram:Content>Reverse charge: VAT liability transfers to the recipient of this invoice</ram:Content></ram:IncludedNote>` : ""}
    </rsm:ExchangedDocument>
    <rsm:SupplyChainTradeTransaction>
        <ram:ApplicableHeaderTradeAgreement>
            <ram:SellerTradeParty>
                <ram:Name>${data.companyName}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>${companyAddress.postalCode}</ram:PostcodeCode>
                    <ram:LineOne>${companyAddress.street}</ram:LineOne>
                    <ram:CityName>${companyAddress.city}</ram:CityName>
                    <ram:CountryID>${companyAddress.country}</ram:CountryID>
                </ram:PostalTradeAddress>
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="VA">${data.companyTaxId}</ram:ID>
                </ram:SpecifiedTaxRegistration>
            </ram:SellerTradeParty>
            <ram:BuyerTradeParty>
                <ram:Name>${data.clientName}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>${clientAddress.postalCode}</ram:PostcodeCode>
                    <ram:LineOne>${clientAddress.street}</ram:LineOne>
                    <ram:CityName>${clientAddress.city}</ram:CityName>
                    <ram:CountryID>${clientAddress.country}</ram:CountryID>
                </ram:PostalTradeAddress>
            </ram:BuyerTradeParty>
        </ram:ApplicableHeaderTradeAgreement>
        <ram:ApplicableHeaderTradeDelivery>
            ${data.deliveryDateStart && data.deliveryDateEnd ? `
            <ram:ActualDeliverySupplyChainEvent>
                <ram:OccurrenceDateTime>
                    <udt:DateTimeString format="102">${formatDate(data.deliveryDateStart)}</udt:DateTimeString>
                </ram:OccurrenceDateTime>
            </ram:ActualDeliverySupplyChainEvent>` : ""}
        </ram:ApplicableHeaderTradeDelivery>
        <ram:ApplicableHeaderTradeSettlement>
            <ram:PaymentReference>${data.invoiceNumber}</ram:PaymentReference>
            <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
            <ram:ReceivableSpecifiedTradeAccountingAccount>
                <ram:ID>${data.invoiceNumber}</ram:ID>
            </ram:ReceivableSpecifiedTradeAccountingAccount>
            ${data.companyBankInfo ? `
            <ram:SpecifiedTradeSettlementPaymentMeans>
                <ram:TypeCode>58</ram:TypeCode>
                <ram:PayeePartyCreditorFinancialAccount>
                    <ram:IBANID>${data.companyBankInfo.split("\n")[0]}</ram:IBANID>
                </ram:PayeePartyCreditorFinancialAccount>
                ${data.companyBankInfo.split("\n")[1] ? `
                <ram:PayeeSpecifiedCreditorFinancialInstitution>
                    <ram:BICID>${data.companyBankInfo.split("\n")[1]}</ram:BICID>
                </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ""}
            </ram:SpecifiedTradeSettlementPaymentMeans>` : ""}
            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                <ram:LineTotalAmount>${subtotal.toFixed(2)}</ram:LineTotalAmount>
                <ram:TaxBasisTotalAmount>${subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
                <ram:TaxTotalAmount currencyID="EUR">${totalVat.toFixed(2)}</ram:TaxTotalAmount>
                <ram:GrandTotalAmount>${total.toFixed(2)}</ram:GrandTotalAmount>
                <ram:DuePayableAmount>${total.toFixed(2)}</ram:DuePayableAmount>
            </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        </ram:ApplicableHeaderTradeSettlement>
        ${data.lineItems.map((item, index) => `
        <ram:IncludedSupplyChainTradeLineItem>
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>${index + 1}</ram:LineID>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>${item.description || "Item"}</ram:Name>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>${parseFloat(item.price).toFixed(2)}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity unitCode="C62">${parseFloat(item.quantity).toFixed(2)}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>VAT</ram:TypeCode>
                    <ram:CategoryCode>${data.reverseCharge ? "AE" : "S"}</ram:CategoryCode>
                    <ram:RateApplicablePercent>${data.reverseCharge ? "0" : parseFloat(item.vat).toFixed(2)}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>${(parseFloat(item.quantity) * parseFloat(item.price)).toFixed(2)}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>
        </ram:IncludedSupplyChainTradeLineItem>`).join("")}
    </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    return xml;
}

// Export the function
export { generateZugferd };
