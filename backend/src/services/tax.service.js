/**
 * Tax Service - Tax calculation engine for GST (Indian) compliance.
 *
 * Supports:
 * - Percentage and fixed-amount taxes
 * - Tax-inclusive and tax-exclusive pricing
 * - Tax groups (e.g., GST 18% = CGST 9% + SGST 9%)
 * - Tax liability tracking via GL accounts
 */

import { TaxCode, TaxGroup, TaxGroupTax } from '../config/database.js';

/**
 * Calculate tax for a line item.
 *
 * @param {Object} params
 * @param {number} params.amount - Line amount (before or after tax depending on isInclusive)
 * @param {string} [params.taxCodeId] - Single tax code ID
 * @param {string} [params.taxGroupId] - Tax group ID (will compute component taxes)
 * @param {number} [params.taxRate] - Direct tax rate override (percentage)
 * @returns {Object} { taxableAmount, taxAmount, totalAmount, taxBreakdown[] }
 */
export async function calculateTax({ amount, taxCodeId, taxGroupId, taxRate }) {
    const lineAmount = parseFloat(amount) || 0;

    // Direct rate override (simple case)
    if (taxRate !== undefined && taxRate !== null && !taxCodeId && !taxGroupId) {
        const rate = parseFloat(taxRate) || 0;
        const taxAmount = roundCurrency(lineAmount * rate / 100);
        return {
            taxableAmount: lineAmount,
            taxAmount,
            totalAmount: roundCurrency(lineAmount + taxAmount),
            taxBreakdown: [{ name: `Tax @ ${rate}%`, rate, amount: taxAmount }]
        };
    }

    // Tax group calculation (e.g., GST = CGST + SGST)
    if (taxGroupId) {
        const groupTaxes = await TaxGroupTax.findAll({
            where: { taxGroupId },
            include: [{ model: TaxCode, attributes: ['id', 'code', 'name', 'rate', 'type', 'isInclusive', 'salesAccountId', 'purchaseAccountId'] }]
        });

        if (groupTaxes.length === 0) {
            return { taxableAmount: lineAmount, taxAmount: 0, totalAmount: lineAmount, taxBreakdown: [] };
        }

        // Check if any component is inclusive (all should match)
        const isInclusive = groupTaxes[0]?.TaxCode?.isInclusive || false;

        let taxableAmount = lineAmount;
        let totalTax = 0;
        const breakdown = [];

        if (isInclusive) {
            // Back-calculate taxable amount from inclusive price
            const totalRate = groupTaxes.reduce((sum, gt) => sum + (parseFloat(gt.TaxCode?.rate) || 0), 0);
            taxableAmount = roundCurrency(lineAmount / (1 + totalRate / 100));

            for (const gt of groupTaxes) {
                const code = gt.TaxCode;
                const rate = parseFloat(code?.rate) || 0;
                const componentTax = roundCurrency(taxableAmount * rate / 100);
                totalTax += componentTax;
                breakdown.push({
                    taxCodeId: code.id,
                    code: code.code,
                    name: code.name,
                    rate,
                    amount: componentTax,
                    salesAccountId: code.salesAccountId,
                    purchaseAccountId: code.purchaseAccountId
                });
            }
        } else {
            for (const gt of groupTaxes) {
                const code = gt.TaxCode;
                const rate = parseFloat(code?.rate) || 0;
                const componentTax = code.type === 'Fixed'
                    ? parseFloat(code.rate)
                    : roundCurrency(taxableAmount * rate / 100);
                totalTax += componentTax;
                breakdown.push({
                    taxCodeId: code.id,
                    code: code.code,
                    name: code.name,
                    rate,
                    amount: componentTax,
                    salesAccountId: code.salesAccountId,
                    purchaseAccountId: code.purchaseAccountId
                });
            }
        }

        return {
            taxableAmount,
            taxAmount: roundCurrency(totalTax),
            totalAmount: roundCurrency(taxableAmount + totalTax),
            taxBreakdown: breakdown
        };
    }

    // Single tax code
    if (taxCodeId) {
        const code = await TaxCode.findByPk(taxCodeId);
        if (!code || !code.isActive) {
            return { taxableAmount: lineAmount, taxAmount: 0, totalAmount: lineAmount, taxBreakdown: [] };
        }

        let taxableAmount = lineAmount;
        let taxAmount;

        if (code.isInclusive) {
            const rate = parseFloat(code.rate) || 0;
            taxableAmount = roundCurrency(lineAmount / (1 + rate / 100));
            taxAmount = roundCurrency(lineAmount - taxableAmount);
        } else if (code.type === 'Fixed') {
            taxAmount = parseFloat(code.rate);
        } else {
            const rate = parseFloat(code.rate) || 0;
            taxAmount = roundCurrency(taxableAmount * rate / 100);
        }

        return {
            taxableAmount,
            taxAmount,
            totalAmount: roundCurrency(taxableAmount + taxAmount),
            taxBreakdown: [{
                taxCodeId: code.id,
                code: code.code,
                name: code.name,
                rate: parseFloat(code.rate),
                amount: taxAmount,
                salesAccountId: code.salesAccountId,
                purchaseAccountId: code.purchaseAccountId
            }]
        };
    }

    // No tax
    return { taxableAmount: lineAmount, taxAmount: 0, totalAmount: lineAmount, taxBreakdown: [] };
}

/**
 * Round to 2 decimal places (standard currency rounding).
 */
function roundCurrency(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}
