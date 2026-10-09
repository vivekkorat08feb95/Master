using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;
using Khatabook.Api.Repositories;

namespace Khatabook.Api.Services;

public class PartyService : IPartyService
{
    private readonly IPartyRepository _partyRepo;
    private readonly ITransactionRepository _txnRepo;
    private readonly IInvoiceRepository _invoiceRepo;

    public PartyService(IPartyRepository partyRepo, ITransactionRepository txnRepo, IInvoiceRepository invoiceRepo)
    {
        _partyRepo = partyRepo;
        _txnRepo = txnRepo;
        _invoiceRepo = invoiceRepo;
    }

    public async Task<List<Party>> GetPartiesAsync(string? type, string? search, bool? isActive = true)
    {
        return await _partyRepo.GetAllAsync(type, search, isActive);
    }

    public async Task<object?> GetPartyDetailsAsync(Guid id)
    {
        var party = await _partyRepo.GetByIdAsync(id);
        if (party == null) return null;

        var txns = await _txnRepo.GetByPartyIdAsync(id);
        var invoices = await _invoiceRepo.GetByPartyIdAsync(id);
        return new
        {
            Party = party,
            Transactions = txns,
            Invoices = invoices
        };
    }

    public async Task<Party> CreatePartyAsync(CreatePartyRequest req)
    {
        var party = new Party
        {
            Id = Guid.NewGuid(),
            Name = req.Name.Trim(),
            NativeName = req.NativeName?.Trim(),
            Phone = req.Phone?.Trim(),
            Email = req.Email?.Trim(),
            Address = req.Address?.Trim(),
            PartyType = string.IsNullOrWhiteSpace(req.PartyType) ? "CUSTOMER" : req.PartyType.Trim().ToUpperInvariant(),
            VehicleNumber = req.VehicleNumber?.Trim(),
            DlNumber = req.DlNumber?.Trim(),
            Gstin = req.Gstin?.Trim().ToUpperInvariant(),
            State = string.IsNullOrWhiteSpace(req.State) ? "Gujarat" : req.State.Trim(),
            StateCode = string.IsNullOrWhiteSpace(req.StateCode) ? "24" : req.StateCode.Trim(),
            OpeningBalance = req.OpeningBalance,
            CurrentBalance = req.OpeningBalance,
            CreditLimit = req.CreditLimit,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _partyRepo.CreateAsync(party);

        if (req.OpeningBalance != 0)
        {
            await _txnRepo.CreateAsync(new Transaction
            {
                Id = Guid.NewGuid(),
                PartyId = party.Id,
                TxnType = req.OpeningBalance > 0 ? "DEBIT" : "CREDIT",
                Amount = Math.Abs(req.OpeningBalance),
                PaymentMode = "OPENING_BALANCE",
                Description = "Opening balance entry",
                TxnDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });
        }

        return party;
    }

    public async Task<Party?> UpdatePartyAsync(Guid id, CreatePartyRequest req)
    {
        var party = await _partyRepo.GetByIdAsync(id);
        if (party == null) return null;

        party.Name = req.Name.Trim();
        party.NativeName = req.NativeName?.Trim();
        party.Phone = req.Phone?.Trim();
        party.Email = req.Email?.Trim();
        party.Address = req.Address?.Trim();
        party.VehicleNumber = req.VehicleNumber?.Trim();
        party.DlNumber = req.DlNumber?.Trim();
        party.CreditLimit = req.CreditLimit;
        party.UpdatedAt = DateTime.UtcNow;

        await _partyRepo.UpdateAsync(party);
        return party;
    }

    public async Task<bool> SoftDeletePartyAsync(Guid id)
    {
        var party = await _partyRepo.GetByIdAsync(id);
        if (party == null) return false;
        await _partyRepo.DeleteAsync(id);
        return true;
    }

    public async Task<bool> TogglePartyActiveAsync(Guid id)
    {
        return await _partyRepo.ToggleActiveAsync(id);
    }

    public async Task<object> RecordTransactionAsync(CreateTransactionRequest req)
    {
        var party = await _partyRepo.GetByIdAsync(req.PartyId);
        if (party == null) throw new KeyNotFoundException("Party not found.");

        var txnType = req.TxnType.Trim().ToUpperInvariant();
        var txn = new Transaction
        {
            Id = Guid.NewGuid(),
            PartyId = req.PartyId,
            TxnType = txnType,
            Amount = req.Amount,
            PaymentMode = string.IsNullOrWhiteSpace(req.PaymentMode) ? "CASH" : req.PaymentMode.Trim().ToUpperInvariant(),
            Description = req.Description,
            TxnDate = req.TxnDate ?? DateTime.UtcNow,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _txnRepo.CreateAsync(txn);

        if (txnType == "DEBIT")
        {
            party.CurrentBalance += req.Amount;
        }
        else
        {
            party.CurrentBalance -= req.Amount;
        }

        party.UpdatedAt = DateTime.UtcNow;
        await _partyRepo.UpdateAsync(party);

        return new
        {
            Transaction = txn,
            NewBalance = party.CurrentBalance
        };
    }

    public async Task<List<Transaction>> GetPartyTransactionsAsync(Guid partyId, bool? isActive = true)
    {
        return await _txnRepo.GetByPartyIdAsync(partyId, isActive);
    }

    public async Task<bool> SoftDeleteTransactionAsync(Guid txnId)
    {
        var txn = await _txnRepo.GetByIdAsync(txnId);
        if (txn == null || !txn.IsActive) return false;

        txn.IsActive = false;
        txn.UpdatedAt = DateTime.UtcNow;
        await _txnRepo.UpdateAsync(txn);

        var party = await _partyRepo.GetByIdAsync(txn.PartyId);
        if (party != null)
        {
            if (txn.TxnType == "DEBIT")
                party.CurrentBalance -= txn.Amount;
            else
                party.CurrentBalance += txn.Amount;

            party.UpdatedAt = DateTime.UtcNow;
            await _partyRepo.UpdateAsync(party);
        }

        return true;
    }

    public async Task<bool> ToggleTransactionActiveAsync(Guid txnId)
    {
        var txn = await _txnRepo.GetByIdAsync(txnId);
        if (txn == null) return false;

        txn.IsActive = !txn.IsActive;
        txn.UpdatedAt = DateTime.UtcNow;
        await _txnRepo.UpdateAsync(txn);

        var party = await _partyRepo.GetByIdAsync(txn.PartyId);
        if (party != null)
        {
            if (txn.IsActive)
            {
                if (txn.TxnType == "DEBIT")
                    party.CurrentBalance += txn.Amount;
                else
                    party.CurrentBalance -= txn.Amount;
            }
            else
            {
                if (txn.TxnType == "DEBIT")
                    party.CurrentBalance -= txn.Amount;
                else
                    party.CurrentBalance += txn.Amount;
            }

            party.UpdatedAt = DateTime.UtcNow;
            await _partyRepo.UpdateAsync(party);
        }

        return txn.IsActive;
    }

    public async Task<SettleUdhaarResult> SettleUdhaarAsync(Guid partyId, SettleUdhaarRequest req)
    {
        var party = await _partyRepo.GetByIdAsync(partyId);
        if (party == null) throw new KeyNotFoundException("Party not found.");

        if (req.Amount <= 0) throw new ArgumentException("Settlement amount must be greater than zero.");

        var previousBalance = party.CurrentBalance;
        var mode = string.IsNullOrWhiteSpace(req.PaymentMode) ? "CASH" : req.PaymentMode.Trim().ToUpperInvariant();
        var settledInvoices = new List<SettledInvoiceSummaryDto>();

        // Fetch all invoices for this party
        var allInvoices = await _invoiceRepo.GetByPartyIdAsync(partyId);
        // Filter invoices that have an outstanding balance due, ordered by oldest first (FIFO)
        var pendingInvoices = allInvoices
            .Where(i => (i.TotalAmount - i.PaidAmount) > 0)
            .OrderBy(i => i.InvoiceDate)
            .ToList();

        decimal remainingAmountToAllocate = req.Amount;

        if (req.Allocations != null && req.Allocations.Count > 0)
        {
            // Explicit manual allocation from user
            foreach (var alloc in req.Allocations)
            {
                if (alloc.AllocatedAmount <= 0) continue;
                var inv = pendingInvoices.FirstOrDefault(i => i.Id == alloc.InvoiceId);
                if (inv == null) continue;

                var prevPaid = inv.PaidAmount;
                var due = inv.TotalAmount - inv.PaidAmount;
                var toApply = Math.Min(alloc.AllocatedAmount, due);

                inv.PaidAmount += toApply;
                if (inv.PaidAmount >= inv.TotalAmount)
                {
                    inv.PaidAmount = inv.TotalAmount;
                    inv.PaymentStatus = "PAID";
                }
                else
                {
                    inv.PaymentStatus = "PARTIAL";
                }

                await _invoiceRepo.UpdateAsync(inv);

                settledInvoices.Add(new SettledInvoiceSummaryDto(
                    inv.Id,
                    inv.InvoiceNumber,
                    inv.TotalAmount,
                    prevPaid,
                    toApply,
                    inv.TotalAmount - inv.PaidAmount,
                    inv.PaymentStatus
                ));
            }
        }
        else
        {
            // Automatic FIFO (First-In, First-Out: Oldest bills cleared first)
            foreach (var inv in pendingInvoices)
            {
                if (remainingAmountToAllocate <= 0) break;

                var prevPaid = inv.PaidAmount;
                var due = inv.TotalAmount - inv.PaidAmount;
                var toApply = Math.Min(remainingAmountToAllocate, due);

                inv.PaidAmount += toApply;
                remainingAmountToAllocate -= toApply;

                if (inv.PaidAmount >= inv.TotalAmount)
                {
                    inv.PaidAmount = inv.TotalAmount;
                    inv.PaymentStatus = "PAID";
                }
                else
                {
                    inv.PaymentStatus = "PARTIAL";
                }

                await _invoiceRepo.UpdateAsync(inv);

                settledInvoices.Add(new SettledInvoiceSummaryDto(
                    inv.Id,
                    inv.InvoiceNumber,
                    inv.TotalAmount,
                    prevPaid,
                    toApply,
                    inv.TotalAmount - inv.PaidAmount,
                    inv.PaymentStatus
                ));
            }
        }

        // Deduct payment from customer balance
        party.CurrentBalance -= req.Amount;
        party.UpdatedAt = DateTime.UtcNow;
        await _partyRepo.UpdateAsync(party);

        // Build audit description
        var billNotes = settledInvoices.Count > 0
            ? $"Settled bills: {string.Join(", ", settledInvoices.Select(s => $"{s.InvoiceNumber} (₹{s.AmountAllocated})"))}"
            : "Udhaar payment received";
        if (!string.IsNullOrWhiteSpace(req.Notes))
        {
            billNotes = $"{req.Notes} - {billNotes}";
        }

        // Record credit transaction in ledger
        var txn = new Transaction
        {
            Id = Guid.NewGuid(),
            PartyId = party.Id,
            TxnType = "CREDIT",
            Amount = req.Amount,
            PaymentMode = mode,
            Description = billNotes,
            TxnDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        await _txnRepo.CreateAsync(txn);

        return new SettleUdhaarResult(
            party.Id,
            party.Name,
            req.Amount,
            previousBalance,
            party.CurrentBalance,
            settledInvoices,
            txn.Id
        );
    }
}
