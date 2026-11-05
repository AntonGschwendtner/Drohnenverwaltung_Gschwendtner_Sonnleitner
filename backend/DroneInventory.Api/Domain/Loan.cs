namespace DroneInventory.Api.Domain;

public class Loan
{
    public int Id { get; set; }

    public int DroneId { get; set; }

    public Drone? Drone { get; set; }

    public int StudentGroupId { get; set; }

    public StudentGroup? StudentGroup { get; set; }

    public DateOnly LoanDate { get; set; }

    public DateOnly? ReturnDate { get; set; }

    public LoanStatus Status { get; set; } = LoanStatus.Active;

    public List<LoanItem> Items { get; set; } = [];
}
