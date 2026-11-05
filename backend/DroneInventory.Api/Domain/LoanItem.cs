namespace DroneInventory.Api.Domain;

public class LoanItem
{
    public int Id { get; set; }

    public int LoanId { get; set; }

    public LoanItemType Type { get; set; }

    public int Quantity { get; set; }
}
