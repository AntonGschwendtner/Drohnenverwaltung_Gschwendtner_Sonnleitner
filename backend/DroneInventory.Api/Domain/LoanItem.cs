namespace DroneInventory.Api.Domain;

public class LoanItem
{
    public int Id { get; set; }

    public int LoanId { get; set; }

    public LoanItemType Type { get; set; }

    public int Quantity { get; set; }

    /// <summary>The quantity that came back with the return; empty while the loan is active (REQ-023).</summary>
    public int? ReturnedQuantity { get; set; }
}
