import { XMLBuilder } from "fast-xml-parser"; // Use a library for structured XML generation

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

    // Build the XML structure
    const xmlData = {
        "rsm:CrossIndustryInvoice": {
            "@xmlns:rsm": "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
            "@xmlns:ram": "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
            "@xmlns:udt": "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
            "@xmlns:qdt": "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
            "rsm:ExchangedDocumentContext": {
                "ram:GuidelineSpecifiedDocumentContextParameter": {
                    "ram:ID": "urn:factur-x.eu:1p0:extended",
                },
            },
            "rsm:ExchangedDocument": {
                "ram:ID": data.invoiceNumber,
                "ram:TypeCode": "380",
                "ram:IssueDateTime": {
                    "udt:DateTimeString": {
                        "@format": "102",
                        "#text": formatDate(data.invoiceDate),
                    },
                },
                ...(data.notes && {
                    "ram:IncludedNote": {
                        "ram:Content": data.notes,
                    },
                }),
                ...(data.reverseCharge && {
                    "ram:IncludedNote": {
                        "ram:Content":
                            "Reverse charge: VAT liability transfers to the recipient of this invoice",
                    },
                }),
            },
            "rsm:SupplyChainTradeTransaction": {
                "ram:ApplicableHeaderTradeAgreement": {
                    "ram:SellerTradeParty": {
                        "ram:Name": data.companyName,
                        "ram:PostalTradeAddress": {
                            "ram:PostcodeCode": companyAddress.postalCode,
                            "ram:LineOne": companyAddress.street,
                            "ram:CityName": companyAddress.city,
                            "ram:CountryID": companyAddress.country,
                        },
                        "ram:SpecifiedTaxRegistration": {
                            "ram:ID": {
                                "@schemeID": "VA",
                                "#text": data.companyTaxId,
                            },
                        },
                    },
                    "ram:BuyerTradeParty": {
                        "ram:Name": data.clientName,
                        "ram:PostalTradeAddress": {
                            "ram:PostcodeCode": clientAddress.postalCode,
                            "ram:LineOne": clientAddress.street,
                            "ram:CityName": clientAddress.city,
                            "ram:CountryID": clientAddress.country,
                        },
                    },
                },
                "ram:ApplicableHeaderTradeDelivery": {
                    ...(data.deliveryDateStart &&
                        data.deliveryDateEnd && {
                            "ram:ActualDeliverySupplyChainEvent": {
                                "ram:OccurrenceDateTime": {
                                    "udt:DateTimeString": {
                                        "@format": "102",
                                        "#text": formatDate(data.deliveryDateStart),
                                    },
                                },
                            },
                        }),
                },
                "ram:ApplicableHeaderTradeSettlement": {
                    "ram:PaymentReference": data.invoiceNumber,
                    "ram:InvoiceCurrencyCode": "EUR",
                    ...(data.companyBankInfo && {
                        "ram:SpecifiedTradeSettlementPaymentMeans": {
                            "ram:TypeCode": "58",
                            "ram:PayeePartyCreditorFinancialAccount": {
                                "ram:IBANID": bankAccount,
                            },
                            ...(bankBIC && {
                                "ram:PayeeSpecifiedCreditorFinancialInstitution": {
                                    "ram:BICID": bankBIC,
                                },
                            }),
                        },
                    }),
                    "ram:InvoiceReferencedDocument": {
                        "ram:IssuerAssignedID": data.invoiceNumber,
                        "ram:FormattedIssueDateTime": {
                            "qdt:DateTimeString": {
                                "@format": "102",
                                "#text": formatDate(data.invoiceDate),
                            },
                        },
                    },
                    "ram:ReceivableSpecifiedTradeAccountingAccount": {
                        "ram:ID": data.invoiceNumber,
                    },
                    "ram:SpecifiedTradeSettlementHeaderMonetarySummation": {
                        "ram:LineTotalAmount": subtotal.toFixed(2),
                        "ram:TaxBasisTotalAmount": subtotal.toFixed(2),
                        "ram:TaxTotalAmount": {
                            "@currencyID": "EUR",
                            "#text": totalVat.toFixed(2),
                        },
                        "ram:GrandTotalAmount": total.toFixed(2),
                        "ram:DuePayableAmount": total.toFixed(2),
                    },
                },
                "ram:IncludedSupplyChainTradeLineItem": data.lineItems.map(
                    (item, index) => ({
                        "ram:AssociatedDocumentLineDocument": {
                            "ram:LineID": index + 1,
                        },
                        "ram:SpecifiedTradeProduct": {
                            "ram:Name": item.description || "Item",
                        },
                        "ram:SpecifiedLineTradeAgreement": {
                            "ram:NetPriceProductTradePrice": {
                                "ram:ChargeAmount": parseFloat(item.price).toFixed(2),
                            },
                        },
                        "ram:SpecifiedLineTradeDelivery": {
                            "ram:BilledQuantity": {
                                "@unitCode": "C62",
                                "#text": parseFloat(item.quantity).toFixed(2),
                            },
                        },
                        "ram:SpecifiedLineTradeSettlement": {
                            "ram:ApplicableTradeTax": {
                                "ram:TypeCode": "VAT",
                                "ram:CategoryCode": data.reverseCharge ? "AE" : "S",
                                "ram:RateApplicablePercent": data.reverseCharge
                                    ? "0"
                                    : parseFloat(item.vat).toFixed(2),
                            },
                            "ram:SpecifiedTradeSettlementLineMonetarySummation": {
                                "ram:LineTotalAmount": (
                                    parseFloat(item.quantity) * parseFloat(item.price)
                                ).toFixed(2),
                            },
                        },
                    })
                ),
            },
        },
    };

    // Use a library to generate XML from the structured object
    const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
    });

    return builder.build(xmlData);
}

// Export the function
export { generateZugferd };
