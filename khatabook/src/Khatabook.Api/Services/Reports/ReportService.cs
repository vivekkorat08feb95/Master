using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Context;
using Khatabook.Api.Repositories;

namespace Khatabook.Api.Services;

public class ReportService : IReportService
{
    private readonly IPartyRepository _partyRepo;
    private readonly IItemRepository _itemRepo;
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly ITransactionRepository _txnRepo;
    private readonly ITenantRepository _tenantRepo;
    private readonly ITenantContext _tenantContext;

    public ReportService(
        IPartyRepository partyRepo,
        IItemRepository itemRepo,
        IInvoiceRepository invoiceRepo,
        ITransactionRepository txnRepo,
        ITenantRepository tenantRepo,
        ITenantContext tenantContext)
    {
        _partyRepo = partyRepo;
        _itemRepo = itemRepo;
        _invoiceRepo = invoiceRepo;
        _txnRepo = txnRepo;
        _tenantRepo = tenantRepo;
        _tenantContext = tenantContext;
    }

    public async Task<object> GetDashboardStatsAsync()
    {
        var parties = await _partyRepo.GetAllAsync(null, null);
        var totalCustomers = parties.Count(p => p.PartyType == "CUSTOMER");
        var totalSuppliers = parties.Count(p => p.PartyType == "SUPPLIER");
        var totalReceivables = parties.Where(p => p.CurrentBalance > 0).Sum(p => p.CurrentBalance);
        var totalPayables = parties.Where(p => p.CurrentBalance < 0).Sum(p => -p.CurrentBalance);

        var items = await _itemRepo.GetAllAsync(null, null);
        var totalItems = items.Count;
        var lowStockCount = items.Count(i => i.CurrentStock <= i.MinStockAlert);

        var today = DateTime.UtcNow.Date;
        var invoices = await _invoiceRepo.GetAllAsync("SALE", null, null, null, 1, 1000);
        var todaysInvoices = invoices.Where(i => i.InvoiceDate >= today).ToList();
        var todaysSales = todaysInvoices.Sum(i => i.TotalAmount);
        var todaysInvoicesCount = todaysInvoices.Count;

        return new
        {
            TotalCustomers = totalCustomers,
            TotalSuppliers = totalSuppliers,
            TotalItems = totalItems,
            LowStockCount = lowStockCount,
            TotalReceivables = totalReceivables,
            TotalPayables = totalPayables,
            TodaysSales = todaysSales,
            TodaysInvoicesCount = todaysInvoicesCount
        };
    }

    public async Task<object> GetDaybookAsync(DateTime? date)
    {
        var targetDate = (date ?? DateTime.UtcNow).Date;
        var nextDate = targetDate.AddDays(1);

        var txns = await _txnRepo.GetByDateRangeAsync(targetDate, nextDate);
        var parties = (await _partyRepo.GetAllAsync(null, null)).ToDictionary(p => p.Id, p => p.Name);

        var list = txns.Select(t => new
        {
            t.Id,
            t.PartyId,
            PartyName = parties.ContainsKey(t.PartyId) ? parties[t.PartyId] : "Unknown",
            t.TxnType,
            t.Amount,
            t.PaymentMode,
            t.Description,
            t.TxnDate
        }).ToList();

        var totalGave = txns.Where(x => x.TxnType == "DEBIT").Sum(x => x.Amount);
        var totalGot = txns.Where(x => x.TxnType == "CREDIT").Sum(x => x.Amount);

        return new
        {
            Date = targetDate,
            Transactions = list,
            TotalGave = totalGave,
            TotalGot = totalGot,
            NetCashFlow = totalGot - totalGave
        };
    }

    public async Task<object> GetStockValuationAsync()
    {
        var items = await _itemRepo.GetAllAsync(null, null);
        var reportItems = items.Select(i => new
        {
            i.Id,
            i.Name,
            i.Barcode,
            i.Category,
            i.Unit,
            i.BatchNumber,
            i.ExpiryDate,
            i.PurchasePrice,
            i.SellingPrice,
            i.CurrentStock,
            StockValue = i.CurrentStock * i.PurchasePrice,
            RetailValue = i.CurrentStock * i.SellingPrice
        }).ToList();

        var totalPurchaseValue = reportItems.Sum(x => x.StockValue);
        var totalRetailValue = reportItems.Sum(x => x.RetailValue);
        var totalQuantity = reportItems.Sum(x => x.CurrentStock);

        return new
        {
            TotalItemsCount = reportItems.Count,
            TotalQuantity = totalQuantity,
            TotalPurchaseValue = totalPurchaseValue,
            TotalRetailValue = totalRetailValue,
            Items = reportItems
        };
    }

    public async Task<List<Party>> GetOutstandingAsync(string? type)
    {
        var parties = await _partyRepo.GetAllAsync(null, null);
        if (string.Equals(type, "SUPPLIER", StringComparison.OrdinalIgnoreCase))
        {
            return parties.Where(p => p.PartyType == "SUPPLIER" && p.CurrentBalance < 0)
                          .OrderByDescending(p => Math.Abs(p.CurrentBalance))
                          .ToList();
        }

        return parties.Where(p => p.PartyType == "CUSTOMER" && p.CurrentBalance > 0)
                      .OrderByDescending(p => Math.Abs(p.CurrentBalance))
                      .ToList();
    }

    public async Task<object> GetGstr1ReportAsync(DateTime fromDate, DateTime toDate)
    {
        // 1. Resolve Store Tenant Information
        Tenant? tenant = null;
        if (_tenantContext.TenantId.HasValue && _tenantContext.TenantId.Value != Guid.Empty)
        {
            tenant = await _tenantRepo.GetByIdAsync(_tenantContext.TenantId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(_tenantContext.TenantCode))
        {
            tenant = await _tenantRepo.GetByCodeAsync(_tenantContext.TenantCode);
        }

        var storeGstin = tenant?.Gstin?.Trim().ToUpperInvariant() ?? "";
        var storeName = tenant?.Name ?? "StockStoreKhata Store";
        var storeStateCode = storeGstin.Length >= 2 && char.IsDigit(storeGstin[0]) && char.IsDigit(storeGstin[1]) 
            ? storeGstin.Substring(0, 2) 
            : "24";
        var storeStateName = GetStateNameByCode(storeStateCode);

        // 2. Fetch Invoices and Lines
        var allInvoices = await _invoiceRepo.GetByDateRangeAsync(fromDate, toDate);
        var invoiceIds = allInvoices.Select(i => i.Id).ToList();
        var allItems = await _invoiceRepo.GetItemsByInvoiceIdsAsync(invoiceIds);
        var itemsByInvoice = allItems.GroupBy(ii => ii.InvoiceId).ToDictionary(g => g.Key, g => g.ToList());

        var parties = await _partyRepo.GetAllAsync(null, null);
        var partyMap = parties.ToDictionary(p => p.Id, p => p);

        var inventoryItems = await _itemRepo.GetAllAsync(null, null);
        var itemHsnMap = inventoryItems.Where(i => !string.IsNullOrWhiteSpace(i.HsnCode))
                                      .ToDictionary(i => i.Id, i => i.HsnCode!.Trim());

        var salesInvoices = allInvoices.Where(i => i.InvoiceType == "SALE").ToList();
        var creditNotes = allInvoices.Where(i => i.InvoiceType == "SALE_RETURN").ToList();

        // 3. Section B2B (Table 4) & B2CS (Table 7)
        var b2bInvoices = new List<object>();
        var b2csGroups = new Dictionary<string, (decimal taxable, decimal cgst, decimal sgst, decimal igst, decimal total, decimal rate, string pos)>();

        foreach (var inv in salesInvoices)
        {
            var party = inv.PartyId.HasValue && partyMap.ContainsKey(inv.PartyId.Value) ? partyMap[inv.PartyId.Value] : null;
            var custGstin = party?.Gstin?.Trim().ToUpperInvariant();
            bool isB2b = !string.IsNullOrWhiteSpace(custGstin) && custGstin.Length >= 10;
            var lines = itemsByInvoice.ContainsKey(inv.Id) ? itemsByInvoice[inv.Id] : new List<InvoiceItem>();

            var custStateCode = !string.IsNullOrWhiteSpace(party?.StateCode) 
                ? party.StateCode 
                : (isB2b && custGstin!.Length >= 2 && char.IsDigit(custGstin[0]) && char.IsDigit(custGstin[1]) ? custGstin.Substring(0, 2) : storeStateCode);
            var custStateName = !string.IsNullOrWhiteSpace(party?.State) ? party.State : GetStateNameByCode(custStateCode);
            var pos = $"{custStateCode}-{custStateName}";
            bool isInterState = custStateCode != storeStateCode;

            if (isB2b)
            {
                var lineSummaries = lines.GroupBy(l => l.TaxRate).Select(g =>
                {
                    decimal lineTaxable = g.Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);
                    decimal lineTax = g.Sum(x => x.TaxAmount);
                    decimal cgst = isInterState ? 0 : Math.Round(lineTax / 2m, 2);
                    decimal sgst = isInterState ? 0 : Math.Round(lineTax / 2m, 2);
                    decimal igst = isInterState ? Math.Round(lineTax, 2) : 0;
                    return new
                    {
                        Rate = g.Key,
                        TaxableValue = Math.Round(lineTaxable, 2),
                        Cgst = cgst,
                        Sgst = sgst,
                        Igst = igst,
                        Cess = 0.00m
                    };
                }).ToList();

                b2bInvoices.Add(new
                {
                    InvoiceNumber = inv.InvoiceNumber,
                    InvoiceDate = inv.InvoiceDate.ToString("dd-MMM-yyyy"),
                    CustomerName = party?.Name ?? inv.PartyName ?? "Registered Dealer",
                    CustomerGstin = custGstin,
                    PlaceOfSupply = pos,
                    ReverseCharge = "N",
                    InvoiceType = "Regular",
                    InvoiceValue = inv.TotalAmount,
                    Items = lineSummaries,
                    TaxableValue = lineSummaries.Sum(x => x.TaxableValue),
                    Cgst = lineSummaries.Sum(x => x.Cgst),
                    Sgst = lineSummaries.Sum(x => x.Sgst),
                    Igst = lineSummaries.Sum(x => x.Igst)
                });
            }
            else
            {
                // B2C Small
                foreach (var line in lines)
                {
                    decimal taxable = (line.Quantity * line.UnitPrice) - line.DiscountAmount;
                    decimal tax = line.TaxAmount;
                    decimal cgst = isInterState ? 0 : Math.Round(tax / 2m, 2);
                    decimal sgst = isInterState ? 0 : Math.Round(tax / 2m, 2);
                    decimal igst = isInterState ? Math.Round(tax, 2) : 0;
                    decimal total = line.Total;

                    string groupKey = $"{pos}_{line.TaxRate}";
                    if (!b2csGroups.ContainsKey(groupKey))
                    {
                        b2csGroups[groupKey] = (0, 0, 0, 0, 0, line.TaxRate, pos);
                    }
                    var cur = b2csGroups[groupKey];
                    b2csGroups[groupKey] = (cur.taxable + taxable, cur.cgst + cgst, cur.sgst + sgst, cur.igst + igst, cur.total + total, line.TaxRate, pos);
                }
            }
        }

        var b2csList = b2csGroups.Values.Select(v => new
        {
            Type = "OE",
            PlaceOfSupply = v.pos,
            Rate = v.rate,
            TaxableValue = Math.Round(v.taxable, 2),
            Cgst = Math.Round(v.cgst, 2),
            Sgst = Math.Round(v.sgst, 2),
            Igst = Math.Round(v.igst, 2),
            TotalValue = Math.Round(v.total, 2)
        }).OrderBy(x => x.Rate).ToList();

        // 4. Section HSN Summary (Table 12)
        var hsnGroups = allItems.Where(ii => salesInvoices.Any(si => si.Id == ii.InvoiceId))
            .GroupBy(ii => new 
            { 
                Hsn = !string.IsNullOrWhiteSpace(ii.HsnCode) 
                    ? ii.HsnCode.Trim() 
                    : (ii.ItemId.HasValue && itemHsnMap.ContainsKey(ii.ItemId.Value) ? itemHsnMap[ii.ItemId.Value] : "9999"),
                Rate = ii.TaxRate,
                Unit = !string.IsNullOrWhiteSpace(ii.Unit) ? ii.Unit.Trim().ToUpperInvariant() : "PCS"
            })
            .Select(g =>
            {
                var desc = g.First().ItemName;
                decimal qty = g.Sum(x => x.Quantity);
                decimal taxable = g.Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);
                decimal tax = g.Sum(x => x.TaxAmount);
                decimal total = g.Sum(x => x.Total);
                string uqc = MapUnitToUqc(g.Key.Unit);

                return new
                {
                    HsnCode = g.Key.Hsn,
                    Description = desc,
                    Uqc = uqc,
                    TotalQuantity = qty,
                    TotalValue = Math.Round(total, 2),
                    TaxableValue = Math.Round(taxable, 2),
                    Rate = g.Key.Rate,
                    Cgst = Math.Round(tax / 2m, 2),
                    Sgst = Math.Round(tax / 2m, 2),
                    Igst = 0.00m,
                    Cess = 0.00m
                };
            })
            .OrderBy(h => h.HsnCode)
            .ToList();

        // 5. Section Credit Notes (Table 9B CDNR / CDNUR)
        var cdnList = creditNotes.Select(cn =>
        {
            var party = cn.PartyId.HasValue && partyMap.ContainsKey(cn.PartyId.Value) ? partyMap[cn.PartyId.Value] : null;
            var custGstin = party?.Gstin?.Trim().ToUpperInvariant();
            var lines = itemsByInvoice.ContainsKey(cn.Id) ? itemsByInvoice[cn.Id] : new List<InvoiceItem>();
            decimal taxable = lines.Sum(l => (l.Quantity * l.UnitPrice) - l.DiscountAmount);
            decimal tax = lines.Sum(l => l.TaxAmount);

            return new
            {
                CreditNoteNumber = cn.InvoiceNumber,
                CreditNoteDate = cn.InvoiceDate.ToString("dd-MMM-yyyy"),
                OriginalInvoiceNumber = !string.IsNullOrWhiteSpace(cn.Notes) && cn.Notes.Contains("for #") 
                    ? cn.Notes.Substring(cn.Notes.IndexOf("for #") + 5).Split(' ')[0].Trim() 
                    : "ORIGINAL_BILL",
                CustomerName = party?.Name ?? cn.PartyName ?? "Cash Retail",
                CustomerGstin = !string.IsNullOrWhiteSpace(custGstin) ? custGstin : "URP",
                NoteType = "C",
                Reason = "01-Sales Return",
                PlaceOfSupply = $"{storeStateCode}-{storeStateName}",
                TotalRefund = cn.TotalAmount,
                TaxableValue = Math.Round(taxable, 2),
                CgstReversed = Math.Round(tax / 2m, 2),
                SgstReversed = Math.Round(tax / 2m, 2),
                IgstReversed = 0.00m
            };
        }).ToList();

        // 6. Section Documents Issued (Table 13)
        var docIssued = new List<object>
        {
            new
            {
                DocType = "Invoices for Outward Supply",
                FromSerial = salesInvoices.Any() ? salesInvoices.First().InvoiceNumber : "N/A",
                ToSerial = salesInvoices.Any() ? salesInvoices.Last().InvoiceNumber : "N/A",
                TotalCount = salesInvoices.Count,
                CancelledCount = 0,
                NetIssuedCount = salesInvoices.Count
            },
            new
            {
                DocType = "Credit Notes (Sales Returns)",
                FromSerial = creditNotes.Any() ? creditNotes.First().InvoiceNumber : "N/A",
                ToSerial = creditNotes.Any() ? creditNotes.Last().InvoiceNumber : "N/A",
                TotalCount = creditNotes.Count,
                CancelledCount = 0,
                NetIssuedCount = creditNotes.Count
            }
        };

        // 7. Totals & Filing Overview
        decimal grossSales = salesInvoices.Sum(x => x.TotalAmount);
        decimal totalReturns = creditNotes.Sum(x => x.TotalAmount);
        decimal netSales = grossSales - totalReturns;

        decimal totalTaxable = salesInvoices.Sum(x => x.Subtotal - x.DiscountAmount);
        decimal returnsTaxable = creditNotes.Sum(x => x.Subtotal - x.DiscountAmount);
        decimal netTaxable = totalTaxable - returnsTaxable;

        decimal totalOutputTax = salesInvoices.Sum(x => x.TaxAmount);
        decimal totalReturnsTax = creditNotes.Sum(x => x.TaxAmount);
        decimal netTaxPayable = totalOutputTax - totalReturnsTax;

        return new
        {
            Store = new
            {
                Name = storeName,
                Gstin = storeGstin,
                StateCode = storeStateCode,
                State = storeStateName,
                Currency = tenant?.CurrencySymbol ?? "₹"
            },
            Period = new
            {
                FromDate = fromDate,
                ToDate = toDate,
                Month = fromDate.ToString("MMMM yyyy"),
                FpCode = $"{fromDate:MM}{fromDate:yyyy}"
            },
            Overview = new
            {
                GrossSales = Math.Round(grossSales, 2),
                TotalReturns = Math.Round(totalReturns, 2),
                NetSales = Math.Round(netSales, 2),
                TotalTaxable = Math.Round(totalTaxable, 2),
                ReturnsTaxable = Math.Round(returnsTaxable, 2),
                NetTaxable = Math.Round(netTaxable, 2),
                TotalOutputTax = Math.Round(totalOutputTax, 2),
                TotalReturnsTax = Math.Round(totalReturnsTax, 2),
                NetTaxPayable = Math.Round(netTaxPayable, 2),
                TotalCgst = Math.Round(netTaxPayable / 2m, 2),
                TotalSgst = Math.Round(netTaxPayable / 2m, 2),
                TotalIgst = 0.00m,
                B2bInvoicesCount = b2bInvoices.Count,
                B2csInvoicesCount = salesInvoices.Count - b2bInvoices.Count,
                CreditNotesCount = creditNotes.Count,
                TotalInvoicesCount = salesInvoices.Count
            },
            B2B = b2bInvoices,
            B2CS = b2csList,
            HSN = hsnGroups,
            CreditNotes = cdnList,
            DocIssue = docIssued
        };
    }

    private static string MapUnitToUqc(string unit)
    {
        var u = unit.ToUpperInvariant();
        if (u.Contains("KG")) return "KGS";
        if (u.Contains("BAG")) return "BAG";
        if (u.Contains("BOX")) return "BOX";
        if (u.Contains("STRIP")) return "NOS";
        if (u.Contains("PCS") || u.Contains("PIECE") || u.Contains("PC")) return "NOS";
        if (u.Contains("LTR") || u.Contains("LITER")) return "LTR";
        if (u.Contains("MTR") || u.Contains("METER")) return "MTR";
        if (u.Contains("DOZ")) return "DOZ";
        if (u.Contains("TIN")) return "TIN";
        return "OTH";
    }

    private static string GetStateNameByCode(string code)
    {
        return code switch
        {
            "24" => "Gujarat",
            "27" => "Maharashtra",
            "07" => "Delhi",
            "08" => "Rajasthan",
            "09" => "Uttar Pradesh",
            "29" => "Karnataka",
            "33" => "Tamil Nadu",
            "19" => "West Bengal",
            "23" => "Madhya Pradesh",
            "06" => "Haryana",
            "03" => "Punjab",
            "10" => "Bihar",
            _ => "Gujarat"
        };
    }
}
