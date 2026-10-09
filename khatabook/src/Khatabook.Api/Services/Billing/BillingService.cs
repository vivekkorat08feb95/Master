using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;
using Khatabook.Api.Repositories;

namespace Khatabook.Api.Services;

public class BillingService : IBillingService
{
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly IItemRepository _itemRepo;
    private readonly IStockMovementRepository _movementRepo;
    private readonly IPartyRepository _partyRepo;
    private readonly ITransactionRepository _txnRepo;

    public BillingService(
        IInvoiceRepository invoiceRepo,
        IItemRepository itemRepo,
        IStockMovementRepository movementRepo,
        IPartyRepository partyRepo,
        ITransactionRepository txnRepo)
    {
        _invoiceRepo = invoiceRepo;
        _itemRepo = itemRepo;
        _movementRepo = movementRepo;
        _partyRepo = partyRepo;
        _txnRepo = txnRepo;
    }

    public async Task<List<Invoice>> GetInvoicesAsync(string? type, Guid? partyId, Guid? createdBy, string? search, int page, int pageSize, bool? isActive = true)
    {
        return await _invoiceRepo.GetAllAsync(type, partyId, createdBy, search, page, pageSize, isActive);
    }

    public async Task<object?> GetInvoiceDetailsAsync(Guid id)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(id);
        if (invoice == null) return null;

        var items = await _invoiceRepo.GetItemsByInvoiceIdAsync(id);
        return new
        {
            Invoice = invoice,
            Items = items
        };
    }

    public async Task<bool> SoftDeleteInvoiceAsync(Guid id)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(id);
        if (invoice == null) return false;
        await _invoiceRepo.DeleteAsync(id);
        return true;
    }

    public async Task<bool> ToggleInvoiceActiveAsync(Guid id)
    {
        return await _invoiceRepo.ToggleActiveAsync(id);
    }

    public async Task<object> CreateInvoiceAsync(CreateInvoiceRequest req)
    {
        var invoiceType = string.IsNullOrWhiteSpace(req.InvoiceType) ? "SALE" : req.InvoiceType.Trim().ToUpperInvariant();
        var today = DateTime.UtcNow;
        var prefix = invoiceType == "SALE" ? "INV" : "PUR";
        var count = await _invoiceRepo.GetCountByTypeAsync(invoiceType);
        var invoiceNumber = $"{prefix}-{today:yyyyMMdd}-{(count + 1):D4}";

        decimal subtotal = 0;
        decimal totalTax = 0;
        var lineEntities = new List<InvoiceItem>();
        var invoiceId = Guid.NewGuid();

        foreach (var itemDto in req.Items)
        {
            var lineTotalWithoutTax = (itemDto.Quantity * itemDto.UnitPrice) - itemDto.DiscountAmount;
            var taxForLine = (lineTotalWithoutTax * itemDto.TaxRate) / 100m;
            var lineTotal = lineTotalWithoutTax + taxForLine;

            subtotal += (itemDto.Quantity * itemDto.UnitPrice);
            totalTax += taxForLine;

            Item? inventoryItem = null;
            if (itemDto.ItemId.HasValue && itemDto.ItemId.Value != Guid.Empty)
            {
                inventoryItem = await _itemRepo.GetByIdAsync(itemDto.ItemId.Value);
            }

            var lineHsn = !string.IsNullOrWhiteSpace(itemDto.HsnCode) 
                ? itemDto.HsnCode.Trim() 
                : inventoryItem?.HsnCode?.Trim();

            lineEntities.Add(new InvoiceItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                ItemId = itemDto.ItemId,
                ItemName = itemDto.ItemName.Trim(),
                NativeName = itemDto.NativeName?.Trim(),
                Unit = string.IsNullOrWhiteSpace(itemDto.Unit) ? "Pcs" : itemDto.Unit.Trim(),
                HsnCode = lineHsn,
                PriceTier = string.IsNullOrWhiteSpace(itemDto.PriceTier) ? "RETAIL" : itemDto.PriceTier.Trim().ToUpperInvariant(),
                BatchNumber = itemDto.BatchNumber?.Trim(),
                ExpiryDate = itemDto.ExpiryDate,
                Quantity = itemDto.Quantity,
                UnitPrice = itemDto.UnitPrice,
                DiscountAmount = itemDto.DiscountAmount,
                TaxRate = itemDto.TaxRate,
                TaxAmount = taxForLine,
                Total = lineTotal
            });

            if (inventoryItem != null)
            {
                decimal stockDelta = invoiceType == "SALE" ? -itemDto.Quantity : itemDto.Quantity;
                inventoryItem.CurrentStock += stockDelta;
                inventoryItem.UpdatedAt = DateTime.UtcNow;
                    await _itemRepo.UpdateAsync(inventoryItem);

                    await _movementRepo.CreateAsync(new StockMovement
                    {
                        Id = Guid.NewGuid(),
                        ItemId = inventoryItem.Id,
                        MovementType = invoiceType,
                        Quantity = itemDto.Quantity,
                        UnitPrice = itemDto.UnitPrice,
                        StockAfter = inventoryItem.CurrentStock,
                        ReferenceId = invoiceId,
                        BatchNumber = itemDto.BatchNumber ?? inventoryItem.BatchNumber,
                        Reason = $"{invoiceType} #{invoiceNumber}",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

        decimal totalAmount = (subtotal - req.DiscountAmount) + totalTax;
        decimal paidAmount = req.PaidAmount;
        if (paidAmount > totalAmount) paidAmount = totalAmount;

        string paymentStatus = "PAID";
        if (paidAmount == 0) paymentStatus = "UNPAID";
        else if (paidAmount < totalAmount) paymentStatus = "PARTIAL";

        var invoice = new Invoice
        {
            Id = invoiceId,
            InvoiceNumber = invoiceNumber,
            InvoiceType = invoiceType,
            PartyId = req.PartyId,
            PartyName = req.PartyName?.Trim(),
            PartyPhone = req.PartyPhone?.Trim(),
            VehicleNumber = req.VehicleNumber?.Trim(),
            DoctorName = req.DoctorName?.Trim(),
            PatientName = req.PatientName?.Trim(),
            Subtotal = subtotal,
            DiscountAmount = req.DiscountAmount,
            TaxAmount = totalTax,
            TotalAmount = totalAmount,
            PaidAmount = paidAmount,
            PaymentStatus = paymentStatus,
            PaymentMode = string.IsNullOrWhiteSpace(req.PaymentMode) ? "CASH" : req.PaymentMode.Trim().ToUpperInvariant(),
            Notes = req.Notes?.Trim(),
            CreatedBy = req.CreatedBy,
            CreatedByName = req.CreatedByName?.Trim(),
            InvoiceDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _invoiceRepo.CreateAsync(invoice, lineEntities);

        if (req.PartyId.HasValue && req.PartyId.Value != Guid.Empty)
        {
            var party = await _partyRepo.GetByIdAsync(req.PartyId.Value);
            if (party != null)
            {
                decimal unpaidAmount = totalAmount - paidAmount;

                if (invoiceType == "SALE")
                {
                    if (paidAmount > 0)
                    {
                        await _txnRepo.CreateAsync(new Transaction
                        {
                            Id = Guid.NewGuid(),
                            PartyId = party.Id,
                            InvoiceId = invoice.Id,
                            TxnType = "CREDIT",
                            Amount = paidAmount,
                            PaymentMode = invoice.PaymentMode,
                            Description = $"Payment received for Invoice #{invoiceNumber}",
                            TxnDate = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow
                        });
                    }

                    if (unpaidAmount > 0)
                    {
                        party.CurrentBalance += unpaidAmount;
                        party.UpdatedAt = DateTime.UtcNow;
                        await _partyRepo.UpdateAsync(party);

                        await _txnRepo.CreateAsync(new Transaction
                        {
                            Id = Guid.NewGuid(),
                            PartyId = party.Id,
                            InvoiceId = invoice.Id,
                            TxnType = "DEBIT",
                            Amount = unpaidAmount,
                            PaymentMode = "CREDIT_SALE",
                            Description = $"Credit sale on Invoice #{invoiceNumber}",
                            TxnDate = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                else
                {
                    if (unpaidAmount > 0)
                    {
                        party.CurrentBalance -= unpaidAmount;
                        party.UpdatedAt = DateTime.UtcNow;
                        await _partyRepo.UpdateAsync(party);
                    }
                }
            }
        }

        return new
        {
            Invoice = invoice,
            Items = lineEntities
        };
    }

    public async Task<object> ProcessInvoiceReturnAsync(CreateInvoiceReturnRequest req)
    {
        var originalInvoice = await _invoiceRepo.GetByIdAsync(req.OriginalInvoiceId);
        if (originalInvoice == null)
            throw new KeyNotFoundException("Original invoice not found.");

        var originalItems = await _invoiceRepo.GetItemsByInvoiceIdAsync(req.OriginalInvoiceId);
        if (originalItems == null || !originalItems.Any())
            throw new InvalidOperationException("Original invoice has no line items.");

        if (req.Items == null || !req.Items.Any())
            throw new InvalidOperationException("At least one item must be selected for return.");

        var today = DateTime.UtcNow;
        var count = await _invoiceRepo.GetCountByTypeAsync("SALE_RETURN");
        var creditNoteNumber = $"CN-{today:yyyyMMdd}-{(count + 1):D4}";
        var creditNoteId = Guid.NewGuid();

        decimal returnSubtotal = 0;
        decimal returnTax = 0;
        var returnLineEntities = new List<InvoiceItem>();

        foreach (var retItem in req.Items)
        {
            if (retItem.ReturnQuantity <= 0) continue;

            // Match against original item line
            var origLine = originalItems.FirstOrDefault(oi =>
                (retItem.ItemId.HasValue && oi.ItemId == retItem.ItemId) ||
                oi.ItemName.Trim().Equals(retItem.ItemName.Trim(), StringComparison.OrdinalIgnoreCase));

            decimal unitPrice = retItem.UnitPrice > 0 ? retItem.UnitPrice : (origLine?.UnitPrice ?? 0);
            decimal taxRate = retItem.TaxRate >= 0 ? retItem.TaxRate : (origLine?.TaxRate ?? 0);

            var lineSubtotal = retItem.ReturnQuantity * unitPrice;
            var lineTax = (lineSubtotal * taxRate) / 100m;
            var lineTotal = lineSubtotal + lineTax;

            returnSubtotal += lineSubtotal;
            returnTax += lineTax;

            returnLineEntities.Add(new InvoiceItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = creditNoteId,
                ItemId = retItem.ItemId,
                ItemName = retItem.ItemName.Trim(),
                NativeName = origLine?.NativeName,
                Unit = !string.IsNullOrWhiteSpace(retItem.Unit) ? retItem.Unit : (origLine?.Unit ?? "Pcs"),
                HsnCode = origLine?.HsnCode,
                PriceTier = origLine?.PriceTier ?? "RETAIL",
                BatchNumber = origLine?.BatchNumber,
                ExpiryDate = origLine?.ExpiryDate,
                Quantity = retItem.ReturnQuantity,
                UnitPrice = unitPrice,
                DiscountAmount = 0,
                TaxRate = taxRate,
                TaxAmount = lineTax,
                Total = lineTotal
            });

            // Automatically restore inventory stock if requested
            if (req.RestockInventory && retItem.ItemId.HasValue && retItem.ItemId.Value != Guid.Empty)
            {
                var inventoryItem = await _itemRepo.GetByIdAsync(retItem.ItemId.Value);
                if (inventoryItem != null)
                {
                    inventoryItem.CurrentStock += retItem.ReturnQuantity;
                    inventoryItem.UpdatedAt = DateTime.UtcNow;
                    await _itemRepo.UpdateAsync(inventoryItem);

                    await _movementRepo.CreateAsync(new StockMovement
                    {
                        Id = Guid.NewGuid(),
                        ItemId = inventoryItem.Id,
                        MovementType = "SALE_RETURN",
                        Quantity = retItem.ReturnQuantity,
                        UnitPrice = unitPrice,
                        StockAfter = inventoryItem.CurrentStock,
                        ReferenceId = creditNoteId,
                        BatchNumber = origLine?.BatchNumber ?? inventoryItem.BatchNumber,
                        Reason = $"Sales Return for #{originalInvoice.InvoiceNumber}: {req.Reason}",
                        Notes = req.Notes,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        if (!returnLineEntities.Any())
            throw new InvalidOperationException("No valid items to return (quantity must be greater than zero).");

        decimal totalRefundAmount = returnSubtotal + returnTax;

        // Create Credit Note (Invoice with type 'SALE_RETURN')
        var creditNoteInvoice = new Invoice
        {
            Id = creditNoteId,
            InvoiceNumber = creditNoteNumber,
            InvoiceType = "SALE_RETURN",
            PartyId = originalInvoice.PartyId,
            PartyName = originalInvoice.PartyName,
            PartyPhone = originalInvoice.PartyPhone,
            VehicleNumber = originalInvoice.VehicleNumber,
            DoctorName = originalInvoice.DoctorName,
            PatientName = originalInvoice.PatientName,
            Subtotal = returnSubtotal,
            DiscountAmount = 0,
            TaxAmount = returnTax,
            TotalAmount = totalRefundAmount,
            PaidAmount = totalRefundAmount,
            PaymentStatus = "REFUNDED",
            PaymentMode = string.IsNullOrWhiteSpace(req.RefundMode) ? "CASH" : req.RefundMode.Trim().ToUpperInvariant(),
            Notes = $"Sales Return against #{originalInvoice.InvoiceNumber}. Reason: {req.Reason}. {(req.Notes ?? "")}",
            CreatedBy = req.CreatedBy ?? originalInvoice.CreatedBy,
            CreatedByName = req.CreatedByName ?? originalInvoice.CreatedByName,
            InvoiceDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _invoiceRepo.CreateAsync(creditNoteInvoice, returnLineEntities);

        // Update original invoice status
        decimal totalReturnedQty = returnLineEntities.Sum(r => r.Quantity);
        decimal totalOriginalQty = originalItems.Sum(o => o.Quantity);
        bool isFullReturn = totalReturnedQty >= totalOriginalQty || totalRefundAmount >= originalInvoice.TotalAmount;

        originalInvoice.PaymentStatus = isFullReturn ? "RETURNED" : "PARTIALLY_RETURNED";
        await _invoiceRepo.UpdateAsync(originalInvoice);

        // Adjust customer Udhaar balance / Khata ledger if applicable
        if (originalInvoice.PartyId.HasValue && originalInvoice.PartyId.Value != Guid.Empty)
        {
            var party = await _partyRepo.GetByIdAsync(originalInvoice.PartyId.Value);
            if (party != null)
            {
                var refundModeUpper = (req.RefundMode ?? "").ToUpperInvariant();

                if (refundModeUpper == "DEDUCT_UDHAAR" || refundModeUpper == "STORE_CREDIT" || originalInvoice.PaymentStatus == "UNPAID")
                {
                    party.CurrentBalance -= totalRefundAmount;
                    party.UpdatedAt = DateTime.UtcNow;
                    await _partyRepo.UpdateAsync(party);

                    await _txnRepo.CreateAsync(new Transaction
                    {
                        Id = Guid.NewGuid(),
                        PartyId = party.Id,
                        InvoiceId = creditNoteId,
                        TxnType = "CREDIT",
                        Amount = totalRefundAmount,
                        PaymentMode = "CREDIT_NOTE",
                        Description = $"Udhaar reduced via Sales Return #{creditNoteNumber} for Invoice #{originalInvoice.InvoiceNumber}",
                        TxnDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        return new
        {
            CreditNote = creditNoteInvoice,
            Items = returnLineEntities,
            OriginalInvoice = originalInvoice,
            RefundAmount = totalRefundAmount
        };
    }
}

