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

    /// <summary>Optional note such as the purpose of the loan, at most 500 characters (REQ-021).</summary>
    public string? Note { get; set; }

    /// <summary>Optional planned return date; after it an active loan is overdue (REQ-022).</summary>
    public DateOnly? DueDate { get; set; }

    public List<LoanItem> Items { get; set; } = [];
}
