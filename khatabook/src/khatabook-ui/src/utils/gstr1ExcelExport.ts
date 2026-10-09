import * as XLSX from 'xlsx';

export interface Gstr1ReportData {
  store: {
    name: string;
    gstin: string;
    stateCode: string;
    state: string;
    currency: string;
  };
  period: {
    fromDate: string;
    toDate: string;
    month: string;
    fpCode: string;
  };
  overview: {
    grossSales: number;
    totalReturns: number;
    netSales: number;
    totalTaxable: number;
    returnsTaxable: number;
    netTaxable: number;
    totalOutputTax: number;
    totalReturnsTax: number;
    netTaxPayable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    b2bInvoicesCount: number;
    b2csInvoicesCount: number;
    creditNotesCount: number;
    totalInvoicesCount: number;
  };
  b2b: any[];
  b2cs: any[];
  hsn: any[];
  creditNotes: any[];
  docIssue: any[];
}

/**
 * Generates and downloads an official multi-sheet GSTR-1 Excel (.xlsx) workbook
 * strictly formatted for Indian Chartered Accountants (CAs) and GST portal offline tools.
 */
export function exportGstr1ToExcel(data: Gstr1ReportData): void {
  const wb = XLSX.utils.book_new();
  const storeName = data.store.name || 'Store';
  const gstin = data.store.gstin || 'UNREGISTERED';
  const period = data.period.month || 'Current Period';

  // =========================================================================
  // Sheet 1: Filing Overview & Executive Summary
  // =========================================================================
  const overviewRows = [
    ['StockStoreKhata - GSTR-1 TAX & TURNOVER STATEMENT'],
    ['Generated For GST Filing & Audit Verification'],
    [],
    ['Legal Trade Name', storeName],
    ['Store GSTIN', gstin],
    ['Place of Supply / State', `${data.store.stateCode} - ${data.store.state}`],
    ['Filing Tax Period', period],
    ['Date Range', `${new Date(data.period.fromDate).toLocaleDateString()} to ${new Date(data.period.toDate).toLocaleDateString()}`],
    [],
    ['TAX SUMMARY & LIABILITIES (IN INR ₹)'],
    ['Metric Description', 'Amount (₹)'],
    ['Total Gross Sales Turnover (SALE)', data.overview.grossSales],
    ['Total Sales Returns / Credit Notes (SALE_RETURN)', data.overview.totalReturns],
    ['Net Sales Turnover', data.overview.netSales],
    ['Total Taxable Value (Before Tax)', data.overview.totalTaxable],
    ['Net Taxable Value (After Returns)', data.overview.netTaxable],
    ['Output CGST (Central Tax)', data.overview.totalCgst],
    ['Output SGST (State/UT Tax)', data.overview.totalSgst],
    ['Output IGST (Integrated Tax)', data.overview.totalIgst],
    ['Net Total GST Output Liability', data.overview.netTaxPayable],
    [],
    ['INVOICE & DOCUMENT COUNTS'],
    ['Total Outward Invoices', data.overview.totalInvoicesCount],
    ['B2B Registered Invoices', data.overview.b2bInvoicesCount],
    ['B2CS Retail Walk-in Invoices', data.overview.b2csInvoicesCount],
    ['Credit Notes Issued', data.overview.creditNotesCount],
    [],
    ['Generated via StockStoreKhata GST Engine • Ready for CA Sign-off']
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Filing_Overview');

  // =========================================================================
  // Sheet 2: Table 12 - HSN-Wise Summary of Outward Supplies
  // =========================================================================
  const hsnHeader = [
    'HSN/SAC Code',
    'Description',
    'UQC (Unit)',
    'Total Quantity',
    'Total Value (₹)',
    'Taxable Value (₹)',
    'Tax Rate (%)',
    'Central Tax CGST (₹)',
    'State Tax SGST (₹)',
    'Integrated Tax IGST (₹)',
    'Cess Amount (₹)'
  ];

  const hsnRows = (data.hsn || []).map((h) => [
    h.hsnCode || '9999',
    h.description || 'Goods',
    h.uqc || 'NOS',
    h.totalQuantity || 0,
    h.totalValue || 0,
    h.taxableValue || 0,
    h.rate || 0,
    h.cgst || 0,
    h.sgst || 0,
    h.igst || 0,
    h.cess || 0
  ]);

  const wsHsn = XLSX.utils.aoa_to_sheet([hsnHeader, ...hsnRows]);
  XLSX.utils.book_append_sheet(wb, wsHsn, 'HSN_Summary');

  // =========================================================================
  // Sheet 3: Table 4 - B2B Invoices (Sales to GST Registered Persons)
  // =========================================================================
  const b2bHeader = [
    'GSTIN/UIN of Recipient',
    'Receiver Trade Name',
    'Invoice Number',
    'Invoice Date',
    'Invoice Value (₹)',
    'Place of Supply',
    'Reverse Charge',
    'Invoice Type',
    'Taxable Value (₹)',
    'Central Tax CGST (₹)',
    'State Tax SGST (₹)',
    'Integrated Tax IGST (₹)'
  ];

  const b2bRows = (data.b2b || []).map((inv) => [
    inv.customerGstin || '',
    inv.customerName || '',
    inv.invoiceNumber || '',
    inv.invoiceDate || '',
    inv.invoiceValue || 0,
    inv.placeOfSupply || '',
    inv.reverseCharge || 'N',
    inv.invoiceType || 'Regular',
    inv.taxableValue || 0,
    inv.cgst || 0,
    inv.sgst || 0,
    inv.igst || 0
  ]);

  const wsB2b = XLSX.utils.aoa_to_sheet([b2bHeader, ...b2bRows]);
  XLSX.utils.book_append_sheet(wb, wsB2b, 'B2B_Invoices');

  // =========================================================================
  // Sheet 4: Table 7 - B2CS (B2C Small / Walk-in Consumers)
  // =========================================================================
  const b2csHeader = [
    'Type',
    'Place of Supply',
    'Applicable % of Tax Rate',
    'Taxable Value (₹)',
    'Central Tax CGST (₹)',
    'State Tax SGST (₹)',
    'Integrated Tax IGST (₹)',
    'Total Value (₹)'
  ];

  const b2csRows = (data.b2cs || []).map((row) => [
    row.type || 'OE',
    row.placeOfSupply || '',
    row.rate || 0,
    row.taxableValue || 0,
    row.cgst || 0,
    row.sgst || 0,
    row.igst || 0,
    row.totalValue || 0
  ]);

  const wsB2cs = XLSX.utils.aoa_to_sheet([b2csHeader, ...b2csRows]);
  XLSX.utils.book_append_sheet(wb, wsB2cs, 'B2CS_Invoices');

  // =========================================================================
  // Sheet 5: Table 9B - Credit & Debit Notes (Sales Returns)
  // =========================================================================
  const cdnHeader = [
    'Recipient GSTIN',
    'Customer Name',
    'Credit Note Number',
    'Note Date',
    'Note Type',
    'Place of Supply',
    'Reason for Issuing',
    'Original Invoice Reference',
    'Total Refund Value (₹)',
    'Taxable Value (₹)',
    'CGST Reversed (₹)',
    'SGST Reversed (₹)',
    'IGST Reversed (₹)'
  ];

  const cdnRows = (data.creditNotes || []).map((cn) => [
    cn.customerGstin || 'URP',
    cn.customerName || '',
    cn.creditNoteNumber || '',
    cn.creditNoteDate || '',
    cn.noteType || 'C',
    cn.placeOfSupply || '',
    cn.reason || '01-Sales Return',
    cn.originalInvoiceNumber || '',
    cn.totalRefund || 0,
    cn.taxableValue || 0,
    cn.cgstReversed || 0,
    cn.sgstReversed || 0,
    cn.igstReversed || 0
  ]);

  const wsCdn = XLSX.utils.aoa_to_sheet([cdnHeader, ...cdnRows]);
  XLSX.utils.book_append_sheet(wb, wsCdn, 'CDNR_CreditNotes');

  // =========================================================================
  // Sheet 6: Table 13 - Documents Issued Summary
  // =========================================================================
  const docHeader = [
    'Nature of Document',
    'Sr. No. From',
    'Sr. No. To',
    'Total Number',
    'Cancelled Count',
    'Net Number Issued'
  ];

  const docRows = (data.docIssue || []).map((d) => [
    d.docType || '',
    d.fromSerial || '',
    d.toSerial || '',
    d.totalCount || 0,
    d.cancelledCount || 0,
    d.netIssuedCount || 0
  ]);

  const wsDoc = XLSX.utils.aoa_to_sheet([docHeader, ...docRows]);
  XLSX.utils.book_append_sheet(wb, wsDoc, 'Docs_Issued');

  // Download Excel Workbook
  const safeName = storeName.replace(/[^a-zA-Z0-9]/g, '_');
  const safePeriod = period.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `GSTR1_${safeName}_${safePeriod}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Exports GSTR-1 in standardized Government GST Portal offline JSON schema.
 */
export function exportGstr1ToJson(data: Gstr1ReportData): void {
  const portalPayload = {
    gstin: data.store.gstin || 'UNREGISTERED',
    fp: data.period.fpCode || '102026',
    gt: data.overview.grossSales,
    cur_gt: data.overview.netSales,
    b2b: (data.b2b || []).map((inv) => ({
      ctin: inv.customerGstin,
      inv: [
        {
          inum: inv.invoiceNumber,
          idt: inv.invoiceDate,
          val: inv.invoiceValue,
          pos: data.store.stateCode,
          rchrg: 'N',
          inv_typ: 'R',
          itms: (inv.items || []).map((itm: any, idx: number) => ({
            num: idx + 1,
            itm_det: {
              rt: itm.rate,
              txval: itm.taxableValue,
              iamt: itm.igst,
              camt: itm.cgst,
              samt: itm.sgst,
              csamt: 0
            }
          }))
        }
      ]
    })),
    b2cs: (data.b2cs || []).map((row) => ({
      sply_ty: 'INTER',
      pos: data.store.stateCode,
      typ: 'OE',
      rt: row.rate,
      txval: row.taxableValue,
      iamt: row.igst,
      camt: row.cgst,
      samt: row.sgst,
      csamt: 0
    })),
    cdnr: (data.creditNotes || []).map((cn) => ({
      ctin: cn.customerGstin,
      nt: [
        {
          nt_num: cn.creditNoteNumber,
          nt_dt: cn.creditNoteDate,
          ntty: 'C',
          inum: cn.originalInvoiceNumber,
          idt: cn.creditNoteDate,
          val: cn.totalRefund,
          itms: [
            {
              num: 1,
              itm_det: {
                rt: 18,
                txval: cn.taxableValue,
                iamt: cn.igstReversed,
                camt: cn.cgstReversed,
                samt: cn.sgstReversed,
                csamt: 0
              }
            }
          ]
        }
      ]
    })),
    hsn: {
      data: (data.hsn || []).map((h, idx) => ({
        num: idx + 1,
        hsn_sc: h.hsnCode,
        desc: h.description,
        uqc: h.uqc,
        qty: h.totalQuantity,
        val: h.totalValue,
        txval: h.taxableValue,
        iamt: h.igst,
        camt: h.cgst,
        samt: h.sgst,
        csamt: 0
      }))
    },
    doc_issue: {
      doc_det: (data.docIssue || []).map((d, idx) => ({
        doc_num: idx + 1,
        doc_typ: d.docType,
        from: d.fromSerial,
        to: d.toSerial,
        totnum: d.totalCount,
        canc: d.cancelledCount,
        net_issue: d.netIssuedCount
      }))
    }
  };

  const jsonStr = JSON.stringify(portalPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safeName = (data.store.name || 'Store').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `GSTR1_PORTAL_${safeName}_${data.period.fpCode}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
