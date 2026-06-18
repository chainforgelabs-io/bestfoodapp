// Parses an AWS Textract AnalyzeExpense response into a clean, app-friendly shape.
//
// Textract AnalyzeExpense returns an `ExpenseDocuments` array. Each document has:
//   - SummaryFields: vendor name, dates, totals, tax, etc. (each has a Type + ValueDetection)
//   - LineItemGroups: groups of line items, each with fields like ITEM, PRICE, QUANTITY
//
// We normalize the pieces we care about for autofilling a review.

const moneyRegex = /-?\d+(?:[.,]\d{1,2})?/;

function toNumber(raw) {
  if (raw == null) return undefined;
  const match = String(raw).replace(/,/g, "").match(moneyRegex);
  if (!match) return undefined;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

function toDate(raw) {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  // Try common receipt formats like MM/DD/YYYY or MM/DD/YY
  const m = String(raw).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    let [, mm, dd, yy] = m;
    if (yy.length === 2) yy = `20${yy}`;
    const parsed = new Date(Number(yy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

// Build a quick lookup of summary fields keyed by their Textract Type string.
function indexSummaryFields(summaryFields = []) {
  const byType = {};
  for (const field of summaryFields) {
    const type = field?.Type?.Text;
    const value = field?.ValueDetection?.Text;
    if (!type) continue;
    // Keep the highest-confidence value if a type appears more than once.
    const existing = byType[type];
    const confidence = field?.ValueDetection?.Confidence ?? 0;
    if (!existing || confidence > existing.confidence) {
      byType[type] = { value, confidence };
    }
  }
  return byType;
}

function parseLineItems(lineItemGroups = []) {
  const items = [];
  for (const group of lineItemGroups) {
    for (const lineItem of group?.LineItems || []) {
      const fields = {};
      for (const f of lineItem?.LineItemExpenseFields || []) {
        const type = f?.Type?.Text;
        if (type) fields[type] = f?.ValueDetection?.Text;
      }
      const name = (fields.ITEM || fields.PRODUCT_CODE || "").trim();
      if (!name) continue;
      const price = toNumber(fields.PRICE ?? fields.UNIT_PRICE);
      const qty = toNumber(fields.QUANTITY);
      items.push({
        name,
        price: price != null ? price : undefined,
        qty: qty != null && qty > 0 ? qty : 1,
      });
    }
  }
  return items;
}

/**
 * @param {object} awsResponse Raw AnalyzeExpense response from Textract
 * @returns {{
 *   vendorName?: string,
 *   vendorAddress?: { city?: string, state?: string, country?: string },
 *   purchaseDate?: Date,
 *   subtotal?: number,
 *   tax?: number,
 *   tip?: number,
 *   total?: number,
 *   currency?: string,
 *   lineItems: Array<{ name: string, price?: number, qty: number }>
 * }}
 */
function parseAnalyzeExpense(awsResponse) {
  const doc = (awsResponse?.ExpenseDocuments || [])[0] || {};
  const summary = indexSummaryFields(doc.SummaryFields);

  const get = (type) => summary[type]?.value;

  const vendorName = (get("VENDOR_NAME") || get("NAME") || "").trim() || undefined;

  const parsed = {
    vendorName,
    vendorAddress: {
      city: (get("CITY") || "").trim() || undefined,
      state: (get("STATE") || "").trim() || undefined,
      country: (get("COUNTRY") || "").trim() || undefined,
    },
    purchaseDate: toDate(get("INVOICE_RECEIPT_DATE") || get("ORDER_DATE")),
    subtotal: toNumber(get("SUBTOTAL")),
    tax: toNumber(get("TAX")),
    tip: toNumber(get("GRATUITY") || get("TIP")),
    total: toNumber(get("TOTAL") || get("AMOUNT_DUE")),
    currency: (get("CURRENCY") || "").trim() || undefined,
    lineItems: parseLineItems(doc.LineItemGroups),
  };

  // Drop the vendorAddress object entirely if nothing was detected.
  if (
    !parsed.vendorAddress.city &&
    !parsed.vendorAddress.state &&
    !parsed.vendorAddress.country
  ) {
    delete parsed.vendorAddress;
  }

  return parsed;
}

module.exports = { parseAnalyzeExpense, toNumber, toDate };
